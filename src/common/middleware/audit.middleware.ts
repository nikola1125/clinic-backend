import { Injectable, NestMiddleware, Logger } from "@nestjs/common";
import { Request, Response, NextFunction } from "express";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { AuditLog } from "../../entities/audit-log.entity";
import { v4 as uuidv4 } from "uuid";

@Injectable()
export class AuditMiddleware implements NestMiddleware {
  private readonly logger = new Logger("Audit");

  constructor(
    @InjectRepository(AuditLog)
    private auditLogRepo: Repository<AuditLog>,
  ) {}

  use(req: Request, res: Response, next: NextFunction) {
    // Generate or validate request ID
    const rawId = req.headers["x-request-id"] as string;
    const requestId = rawId?.match(/^[\w\-]{1,64}$/) ? rawId : uuidv4();
    (req as any).requestId = requestId;

    const { method, originalUrl, ip } = req;
    const userAgent = req.get("user-agent") || "";
    const startTime = Date.now();

    res.on("finish", async () => {
      const { statusCode } = res;
      const duration = Date.now() - startTime;
      const actor = (req as any).actor;

      const logData = {
        requestId,
        method,
        url: originalUrl,
        statusCode,
        duration: `${duration}ms`,
        ip,
        userAgent,
        actorSub: actor?.sub || null,
        actorRole: actor?.role || null,
      };

      // Structured logging
      if (statusCode >= 400) {
        this.logger.warn(JSON.stringify(logData));
      } else {
        this.logger.log(JSON.stringify(logData));
      }

      // Write to database (async, don't block response)
      try {
        const auditEntry = this.auditLogRepo.create({
          requestId,
          actorSub: actor?.sub,
          actorRole: actor?.role,
          action: "http_request",
          resource: "http",
          resourceId: null,
          method,
          path: originalUrl,
          ip,
          userAgent,
        });
        await this.auditLogRepo.save(auditEntry);
      } catch (error) {
        this.logger.error(
          `Failed to write audit log: ${error.message}`,
          error.stack,
        );
      }
    });

    next();
  }
}
