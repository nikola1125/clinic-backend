import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { ConfigModule } from "@nestjs/config";
import { AppConfigModule } from "./config/config.module";
import { DatabaseModule } from "./database/database.module";
import { AdminModule } from "./modules/admin/admin.module";
import { AuthModule } from "./modules/auth/auth.module";
import { DoctorModule } from "./modules/doctor/doctor.module";
import { PatientModule } from "./modules/patient/patient.module";
import { PublicModule } from "./modules/public/public.module";
import { RegistryModule } from "./modules/registry/registry.module";
import { TriageModule } from "./modules/triage/triage.module";
import { WebsocketModule } from "./modules/websocket/websocket.module";
import { ApplicationsModule } from "./modules/applications/applications.module";
import { ContactModule } from "./modules/contact/contact.module";
import { NotificationsModule } from "./modules/notifications/notifications.module";

import { AuditMiddleware } from "./common/middleware/audit.middleware";
import { AppController } from "./app.controller";
import { FilesController } from "./app.files.controller";
import { CommonServicesModule } from "./common/services/common-services.module";
import { APP_GUARD, APP_FILTER } from "@nestjs/core";
import { RateLimitGuard } from "./common/guards/rate-limit.guard";
import { HttpExceptionFilter } from "./common/filters/http-exception.filter";
import { AuditLog } from "./entities/audit-log.entity";

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: ".env",
    }),
    AppConfigModule,
    DatabaseModule,
    CommonServicesModule,
    TypeOrmModule.forFeature([AuditLog]),
    AdminModule,
    AuthModule,
    DoctorModule,
    PatientModule,
    PublicModule,
    RegistryModule,
    TriageModule,
    WebsocketModule,
    ApplicationsModule,
    ContactModule,
    NotificationsModule,
  ],
  controllers: [AppController, FilesController],
  providers: [
    AuditMiddleware,
    {
      provide: APP_GUARD,
      useClass: RateLimitGuard,
    },
    {
      provide: APP_FILTER,
      useClass: HttpExceptionFilter,
    },
  ],
})
export class AppModule {}
