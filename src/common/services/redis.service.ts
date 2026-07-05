import { Injectable, OnModuleDestroy, OnModuleInit } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import Redis from "ioredis";

@Injectable()
export class RedisService implements OnModuleInit, OnModuleDestroy {
  private client: Redis;

  constructor(private readonly configService: ConfigService) {}

  onModuleInit() {
    const redisUrl = this.configService.get<string>("REDIS_URL");
    this.client = new Redis(redisUrl);
  }

  onModuleDestroy() {
    this.client.disconnect();
  }

  async get(key: string): Promise<string | null> {
    return this.client.get(key);
  }

  async set(
    key: string,
    value: string,
    expirationSeconds?: number,
  ): Promise<void> {
    if (expirationSeconds) {
      await this.client.setex(key, expirationSeconds, value);
    } else {
      await this.client.set(key, value);
    }
  }

  async del(key: string): Promise<void> {
    await this.client.del(key);
  }

  async incr(key: string): Promise<number> {
    return this.client.incr(key);
  }

  async exists(key: string): Promise<boolean> {
    const result = await this.client.exists(key);
    return result === 1;
  }

  async expire(key: string, seconds: number): Promise<void> {
    await this.client.expire(key, seconds);
  }

  async ttl(key: string): Promise<number> {
    return this.client.ttl(key);
  }

  async keys(pattern: string): Promise<string[]> {
    return this.client.keys(pattern);
  }

  /** Set only if the key does not exist. Returns true if this call won. */
  async setNx(
    key: string,
    value: string,
    expirationSeconds: number,
  ): Promise<boolean> {
    const result = await this.client.set(
      key,
      value,
      "EX",
      expirationSeconds,
      "NX",
    );
    return result === "OK";
  }

  async hset(key: string, field: string, value: string): Promise<void> {
    await this.client.hset(key, field, value);
  }

  /** Returns the number of fields actually removed. */
  async hdel(key: string, field: string): Promise<number> {
    return this.client.hdel(key, field);
  }

  async hgetall(key: string): Promise<Record<string, string>> {
    return this.client.hgetall(key);
  }

  async hlen(key: string): Promise<number> {
    return this.client.hlen(key);
  }

  async flushdb(): Promise<void> {
    await this.client.flushdb();
  }
}
