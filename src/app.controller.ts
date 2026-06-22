import { Controller, Get } from "@nestjs/common";
import { RedisService } from "./common/services/redis.service";
import { DataSource } from "typeorm";

@Controller()
export class AppController {
  constructor(
    private redis: RedisService,
    private dataSource: DataSource,
  ) {}

  @Get("health")
  async health() {
    const checks = {
      status: "ok",
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      database: "unknown",
      redis: "unknown",
    };

    // Check database
    try {
      await this.dataSource.query("SELECT 1");
      checks.database = "healthy";
    } catch {
      checks.database = "unhealthy";
      checks.status = "degraded";
    }

    // Check Redis
    try {
      await this.redis.set("health_check", "ok", 5);
      const val = await this.redis.get("health_check");
      checks.redis = val === "ok" ? "healthy" : "unhealthy";
    } catch {
      checks.redis = "unhealthy";
      checks.status = "degraded";
    }

    return checks;
  }
}
