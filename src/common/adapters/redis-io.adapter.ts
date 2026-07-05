import { INestApplication } from "@nestjs/common";
import { IoAdapter } from "@nestjs/platform-socket.io";
import { ServerOptions } from "socket.io";
import { createAdapter } from "@socket.io/redis-adapter";
import Redis from "ioredis";

/**
 * Socket.IO adapter backed by Redis pub/sub. With this, broadcasts and
 * per-socket emits (server.to(socketId)) reach sockets on ANY machine,
 * which is required to run more than one backend instance.
 */
export class RedisIoAdapter extends IoAdapter {
  private adapterConstructor: ReturnType<typeof createAdapter>;
  private pubClient: Redis;
  private subClient: Redis;

  constructor(app: INestApplication) {
    super(app);
  }

  connectToRedis(redisUrl: string): void {
    this.pubClient = new Redis(redisUrl);
    this.subClient = this.pubClient.duplicate();
    this.adapterConstructor = createAdapter(this.pubClient, this.subClient);
  }

  createIOServer(port: number, options?: ServerOptions): any {
    const server = super.createIOServer(port, options);
    server.adapter(this.adapterConstructor);
    return server;
  }
}
