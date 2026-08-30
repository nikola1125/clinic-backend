// Sentry instrumentation MUST load before any other import so it can patch
// libraries. No-op unless SENTRY_DSN is set.
import "./instrument";
import { NestFactory } from "@nestjs/core";
import { ValidationPipe, Logger } from "@nestjs/common";
import helmet from "helmet";
import { AppModule } from "./app.module";
import { AppConfigService } from "./config/config.service";
import { RedisIoAdapter } from "./common/adapters/redis-io.adapter";

const logger = new Logger("Bootstrap");

async function validateEnvironment() {
  const required = [
    "DATABASE_URL",
    "REDIS_URL",
    "JWT_SECRET_KEY",
    "ADMIN_SEED_PASSWORD",
  ];

  const missing = required.filter((key) => !process.env[key]);

  if (missing.length > 0) {
    throw new Error(
      `Missing required environment variables: ${missing.join(", ")}`,
    );
  }

  // Warn about weak admin password
  const weakPasswords = ["admin123", "password", "123456", "changeme"];
  const adminPw = process.env.ADMIN_SEED_PASSWORD || "";
  if (weakPasswords.some((weak) => adminPw.toLowerCase().includes(weak))) {
    logger.warn("⚠️  ADMIN_SEED_PASSWORD is weak! Change it immediately!");
  }
}

async function bootstrap() {
  // Validate environment before starting
  await validateEnvironment();

  const app = await NestFactory.create(AppModule, {
    logger: ["error", "warn", "log", "debug", "verbose"],
  });

  const config = app.get(AppConfigService);

  // Socket.IO events flow through Redis so multiple machines (and machine
  // restarts) share the same broadcast plane
  const redisIoAdapter = new RedisIoAdapter(app);
  redisIoAdapter.connectToRedis(process.env.REDIS_URL!);
  app.useWebSocketAdapter(redisIoAdapter);

  // Security headers (before CORS so helmet doesn't override)
  app.use(
    helmet({
      contentSecurityPolicy: {
        directives: {
          defaultSrc: ["'self'"],
          styleSrc: ["'self'", "'unsafe-inline'"],
          scriptSrc: ["'self'"],
          imgSrc: ["'self'", "data:", "https:"],
        },
      },
      crossOriginResourcePolicy: false,
      crossOriginOpenerPolicy: false,
      hsts: {
        maxAge: 31536000,
        includeSubDomains: true,
        preload: true,
      },
    }),
  );

  // CORS
  const isDev = process.env.NODE_ENV !== "production";
  const origins = config.corsOrigins
    .split(",")
    .map((o) => o.trim())
    .filter(Boolean);
  const allowAll = isDev || origins.includes("*");
  app.enableCors({
    origin: allowAll ? true : origins,
    credentials: true,
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allowedHeaders: [
      "Authorization",
      "Content-Type",
      "X-Request-Id",
      "X-Api-Key",
    ],
  });

  // Body size limit (1MB)
  app.use(require("express").json({ limit: "1mb" }));
  app.use(require("express").urlencoded({ limit: "1mb", extended: true }));

  // Global validation pipe
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      transformOptions: {
        enableImplicitConversion: true,
      },
    }),
  );

  const port = parseInt(process.env.PORT || "8000", 10);
  await app.listen(port);

  logger.log(`✅ Application is running on: http://localhost:${port}`);
  logger.log(`✅ Health check: http://localhost:${port}/health`);
  logger.log(`✅ Environment: ${process.env.NODE_ENV || "development"}`);

  // Graceful shutdown
  const signals = ["SIGTERM", "SIGINT"];
  signals.forEach((signal) => {
    process.on(signal, async () => {
      logger.log(`Received ${signal}, starting graceful shutdown...`);

      try {
        await app.close();
        logger.log("✅ Application closed successfully");
        process.exit(0);
      } catch (error) {
        logger.error("❌ Error during shutdown:", error);
        process.exit(1);
      }
    });
  });
}

bootstrap().catch((err) => {
  logger.error("❌ Failed to start application:", err);
  process.exit(1);
});
