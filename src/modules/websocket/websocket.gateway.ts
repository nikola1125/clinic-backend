import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  OnGatewayConnection,
  OnGatewayDisconnect,
  ConnectedSocket,
  MessageBody,
} from "@nestjs/websockets";
import { Namespace, Socket } from "socket.io";
import { WebsocketService } from "./websocket.service";
import { Logger } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { Appointment } from "../../entities/appointment.entity";
import { Actor } from "../../common/interfaces/actor.interface";
import { RedisService } from "../../common/services/redis.service";
import * as crypto from "crypto";

interface SocketData {
  actor: Actor;
  appointmentId: string;
  role: string;
}

// Room state lives in Redis (not process memory) so calls survive machine
// restarts and work when the app runs on more than one machine:
//   meet:room:<appointmentId>    hash  socketId -> role
//   meet:session:<appointmentId> str   active WebRTC session id
const roomKey = (appointmentId: string) => `meet:room:${appointmentId}`;
const sessionKey = (appointmentId: string) => `meet:session:${appointmentId}`;
const ROOM_TTL_SECONDS = 24 * 3600;

@WebSocketGateway({
  cors: {
    origin: "*",
    credentials: true,
  },
  namespace: "/meet",
})
export class WebsocketGateway
  implements OnGatewayConnection, OnGatewayDisconnect
{
  // With a namespaced gateway, Nest injects the Namespace — its socket
  // map is `sockets` directly (not `sockets.sockets` like the root Server).
  @WebSocketServer()
  server: Namespace;

  private readonly logger = new Logger(WebsocketGateway.name);

  constructor(
    private readonly websocketService: WebsocketService,
    private readonly redisService: RedisService,
    @InjectRepository(Appointment)
    private appointmentRepo: Repository<Appointment>,
  ) {}

  private async getPeers(
    appointmentId: string,
  ): Promise<Record<string, string>> {
    return this.redisService.hgetall(roomKey(appointmentId));
  }

  private signalingPeers(
    peers: Record<string, string>,
  ): Array<[string, string]> {
    return Object.entries(peers).filter(
      ([, role]) => role === "doctor" || role === "patient",
    );
  }

  private peerByRole(
    peers: Record<string, string>,
    targetRole: string,
  ): string | null {
    for (const [socketId, role] of Object.entries(peers)) {
      if (role === targetRole) return socketId;
    }
    return null;
  }

  async handleConnection(client: Socket) {
    try {
      const ticket = client.handshake.query.ticket as string;
      const token = client.handshake.query.token as string;
      const appointmentId = client.handshake.query.appointmentId as string;

      if (!ticket && !token) {
        client.disconnect();
        return;
      }

      let actor: Actor | null = null;
      if (ticket) {
        actor = await this.websocketService.verifyTicket(ticket);
      } else if (token) {
        // Legacy fallback - decode token manually if needed
        client.disconnect();
        return;
      }

      if (!actor || !appointmentId) {
        client.disconnect();
        return;
      }

      const appt = await this.appointmentRepo.findOne({
        where: { id: appointmentId, deletedAt: null },
      });

      if (!appt) {
        client.disconnect();
        return;
      }

      const isDoctor =
        actor.role === "doctor" && appt.doctorId === actor.doctor_id;
      const isPatient =
        actor.role === "patient" && appt.patientId === actor.patient_id;
      const isAdmin = actor.role === "admin";

      if (!isDoctor && !isPatient && !isAdmin) {
        client.disconnect();
        return;
      }

      const { ok, reason } = this.websocketService.validateJoinWindow(
        appt,
        actor.role,
      );
      if (!ok) {
        client.emit("error", { message: reason });
        client.disconnect();
        return;
      }

      const role = actor.role;
      client.data = { actor, appointmentId, role } as SocketData;

      const rKey = roomKey(appointmentId);
      let peers = await this.getPeers(appointmentId);

      // Evict stale same-role socket (possibly on another machine).
      // Remove it from the room FIRST so its disconnect handler (hdel
      // returns 0) cannot tear down the session we mint below.
      if (role === "doctor" || role === "patient") {
        const staleSocketId = this.peerByRole(peers, role);
        if (staleSocketId && staleSocketId !== client.id) {
          await this.redisService.hdel(rKey, staleSocketId);
          delete peers[staleSocketId];
          this.server.to(staleSocketId).emit("session-evicted", {
            reason: "Another connection for this role was established",
          });
          this.server.in(staleSocketId).disconnectSockets();
        }
      }

      await this.redisService.hset(rKey, client.id, role);
      await this.redisService.expire(rKey, ROOM_TTL_SECONDS);
      peers[client.id] = role;

      // Tell new peer about existing peers
      for (const [existingSocketId, existingRole] of Object.entries(peers)) {
        if (existingSocketId !== client.id) {
          client.emit("peer-joined", { role: existingRole });
        }
      }

      // Notify others
      client.to(appointmentId).emit("peer-joined", { role });
      client.join(appointmentId);

      // If both doctor and patient present, mint a fresh session. setNx
      // makes concurrent joins on different machines agree on ONE id.
      const sigPeers = this.signalingPeers(peers);
      if (sigPeers.length === 2 && (role === "doctor" || role === "patient")) {
        const candidate = crypto.randomUUID();
        await this.redisService.setNx(
          sessionKey(appointmentId),
          candidate,
          ROOM_TTL_SECONDS,
        );
        const sessionId = await this.redisService.get(
          sessionKey(appointmentId),
        );
        for (const [socketId] of sigPeers) {
          this.server.to(socketId).emit("session-ready", {
            session_id: sessionId,
            appointment_id: appointmentId,
          });
        }
      }

      this.logger.log(
        `Client ${client.id} connected as ${role} to appointment ${appointmentId}`,
      );
    } catch (error) {
      this.logger.error(`Connection error: ${error.message}`);
      client.disconnect();
    }
  }

  async handleDisconnect(client: Socket) {
    const data = client.data as SocketData;
    if (!data || !data.appointmentId) {
      return;
    }

    const { appointmentId, role } = data;

    try {
      // If we were already evicted (hdel returns 0), the room has moved on —
      // don't touch the session that belongs to our replacement.
      const removed = await this.redisService.hdel(
        roomKey(appointmentId),
        client.id,
      );
      if (removed === 0) {
        return;
      }

      if (role === "doctor" || role === "patient") {
        const endingSession = await this.redisService.get(
          sessionKey(appointmentId),
        );
        if (endingSession) {
          await this.redisService.del(sessionKey(appointmentId));
          client.to(appointmentId).emit("session-ended", {
            session_id: endingSession,
            role,
          });
        }
      }

      client.to(appointmentId).emit("peer-left", { role });

      const remaining = await this.redisService.hlen(roomKey(appointmentId));
      if (remaining === 0) {
        await this.redisService.del(roomKey(appointmentId));
      }

      this.logger.log(
        `Client ${client.id} disconnected from appointment ${appointmentId}`,
      );
    } catch (error) {
      this.logger.error(`Disconnect cleanup error: ${error.message}`);
    }
  }

  @SubscribeMessage("offer")
  handleOffer(@ConnectedSocket() client: Socket, @MessageBody() data: any) {
    return this.relaySignaling(client, data, "offer");
  }

  @SubscribeMessage("answer")
  handleAnswer(@ConnectedSocket() client: Socket, @MessageBody() data: any) {
    return this.relaySignaling(client, data, "answer");
  }

  @SubscribeMessage("ice-candidate")
  handleIceCandidate(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: any,
  ) {
    return this.relaySignaling(client, data, "ice-candidate");
  }

  private async relaySignaling(client: Socket, data: any, msgType: string) {
    const socketData = client.data as SocketData;
    if (!socketData || !socketData.appointmentId) {
      return;
    }

    const { appointmentId, role } = socketData;

    if (role !== "doctor" && role !== "patient") {
      return;
    }

    const sessionId = await this.redisService.get(sessionKey(appointmentId));
    const msgSession = data.session_id;
    if (msgSession && msgSession !== sessionId) {
      return;
    }

    const payload = {
      ...data,
      type: msgType,
      from_role: role,
      session_id: sessionId,
    };

    const peers = await this.getPeers(appointmentId);
    for (const [socketId] of this.signalingPeers(peers)) {
      if (socketId !== client.id) {
        this.server.to(socketId).emit(msgType, payload);
      }
    }
  }

  @SubscribeMessage("chat")
  async handleChat(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: any,
  ) {
    const socketData = client.data as SocketData;
    if (!socketData || !socketData.appointmentId) {
      return;
    }

    const { appointmentId, role } = socketData;

    let text =
      typeof data.text === "string" ? data.text.substring(0, 5000) : null;
    let imageUrl = typeof data.imageUrl === "string" ? data.imageUrl : null;

    if (imageUrl && !imageUrl.startsWith("https://")) {
      imageUrl = null;
    } else if (imageUrl) {
      imageUrl = imageUrl.substring(0, 2048);
    }

    if (!text && !imageUrl) {
      return;
    }

    const saved = await this.websocketService.saveChatMessage(
      appointmentId,
      role,
      text || undefined,
      imageUrl || undefined,
    );

    this.server.to(appointmentId).emit("chat", {
      type: "chat",
      from_role: role,
      text,
      imageUrl,
      message: {
        id: saved.id,
        appointment_id: saved.appointmentId,
        sender: saved.sender,
        message: saved.message,
        image_url: saved.imageUrl,
        created_at: saved.createdAt?.toISOString(),
      },
    });
  }

  @SubscribeMessage("ping")
  handlePing(@ConnectedSocket() client: Socket) {
    client.emit("pong", { type: "pong" });
  }
}
