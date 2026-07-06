import {
  WebSocketGateway,
  WebSocketServer,
  OnGatewayInit,
  OnGatewayConnection,
  OnGatewayDisconnect,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { Logger } from '@nestjs/common';
import { NotificationsService } from './notifications.service';
import { SecurityService } from '../../common/services/security.service';

@WebSocketGateway({
  namespace: '/notifications',
  // Send a ping every 25s so Fly.io's proxy (which kills idle TCP after ~60s)
  // never sees the connection as idle.
  pingInterval: 25000,
  pingTimeout: 60000,
  cors: {
    origin: (origin: string, callback: (err: Error | null, allow?: boolean) => void) => {
      const allowed = (process.env.CORS_ORIGINS || '*').split(',').map((s) => s.trim());
      if (allowed.includes('*') || !origin || allowed.some((o) => o === origin)) {
        callback(null, true);
      } else {
        callback(new Error('Not allowed by CORS'));
      }
    },
    credentials: true,
  },
})
export class NotificationsGateway
  implements OnGatewayInit, OnGatewayConnection, OnGatewayDisconnect
{
  @WebSocketServer()
  server: Server;

  private readonly logger = new Logger(NotificationsGateway.name);

  constructor(
    private readonly notificationsService: NotificationsService,
    private readonly securityService: SecurityService,
  ) {}

  afterInit(server: Server) {
    this.notificationsService.setServer(server);
    this.logger.log('Notifications gateway initialized');
  }

  async handleConnection(client: Socket) {
    try {
      const token = client.handshake.auth?.token as string;
      if (!token) {
        client.disconnect();
        return;
      }

      const actor = this.securityService.decodeJwt(token);
      if (!actor?.sub) {
        client.disconnect();
        return;
      }

      client.data = { actor };
      client.join(`user:${actor.sub}`);
      this.logger.log(
        `Notifications client connected: ${actor.sub} (${actor.role})`,
      );
    } catch {
      client.disconnect();
    }
  }

  handleDisconnect(client: Socket) {
    const actor = client.data?.actor;
    if (actor) {
      this.logger.log(`Notifications client disconnected: ${actor.sub}`);
    }
  }
}
