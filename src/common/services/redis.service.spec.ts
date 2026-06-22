import { Test, TestingModule } from "@nestjs/testing";
import { ConfigService } from "@nestjs/config";
import { RedisService } from "./redis.service";

describe("RedisService", () => {
  let service: RedisService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        RedisService,
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn((key: string) => {
              if (key === "REDIS_URL") return "redis://localhost:6379";
              return undefined;
            }),
          },
        },
      ],
    }).compile();

    service = module.get<RedisService>(RedisService);
    await service.onModuleInit();
  });

  afterEach(async () => {
    await service.flushdb(); // Clean up
    await service.onModuleDestroy();
  });

  describe("Basic Operations", () => {
    it("should set and get a value", async () => {
      await service.set("test-key", "test-value");
      const value = await service.get("test-key");
      expect(value).toBe("test-value");
    });

    it("should return null for non-existent key", async () => {
      const value = await service.get("non-existent");
      expect(value).toBeNull();
    });

    it("should delete a key", async () => {
      await service.set("delete-me", "value");
      await service.del("delete-me");
      const value = await service.get("delete-me");
      expect(value).toBeNull();
    });

    it("should check if key exists", async () => {
      await service.set("exists-key", "value");
      const exists = await service.exists("exists-key");
      expect(exists).toBe(true);

      const notExists = await service.exists("not-exists");
      expect(notExists).toBe(false);
    });
  });

  describe("Expiration", () => {
    it("should set value with expiration", async () => {
      await service.set("expire-key", "value", 1); // 1 second
      const value = await service.get("expire-key");
      expect(value).toBe("value");

      // Wait for expiration
      await new Promise((resolve) => setTimeout(resolve, 1100));
      const expired = await service.get("expire-key");
      expect(expired).toBeNull();
    });

    it("should set expiration on existing key", async () => {
      await service.set("expire-later", "value");
      await service.expire("expire-later", 1);

      await new Promise((resolve) => setTimeout(resolve, 1100));
      const expired = await service.get("expire-later");
      expect(expired).toBeNull();
    });

    it("should get TTL", async () => {
      await service.set("ttl-key", "value", 10);
      const ttl = await service.ttl("ttl-key");
      expect(ttl).toBeGreaterThan(0);
      expect(ttl).toBeLessThanOrEqual(10);
    });
  });

  describe("Increment", () => {
    it("should increment a counter", async () => {
      const count1 = await service.incr("counter");
      expect(count1).toBe(1);

      const count2 = await service.incr("counter");
      expect(count2).toBe(2);

      const count3 = await service.incr("counter");
      expect(count3).toBe(3);
    });
  });

  describe("Keys Pattern", () => {
    it("should find keys by pattern", async () => {
      await service.set("user:1", "alice");
      await service.set("user:2", "bob");
      await service.set("other:1", "charlie");

      const userKeys = await service.keys("user:*");
      expect(userKeys).toHaveLength(2);
      expect(userKeys).toContain("user:1");
      expect(userKeys).toContain("user:2");
    });
  });
});
