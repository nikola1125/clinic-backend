import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { ConfigModule } from "@nestjs/config";
import { AuthController } from "./auth.controller";
import { AuthService } from "./auth.service";
import { User } from "../../entities/user.entity";
import { Patient } from "../../entities/patient.entity";
import { Doctor } from "../../entities/doctor.entity";
import { RedisService } from "../../common/services/redis.service";
import { SecurityService } from "../../common/services/security.service";

@Module({
  imports: [ConfigModule, TypeOrmModule.forFeature([User, Patient, Doctor])],
  controllers: [AuthController],
  providers: [AuthService, RedisService, SecurityService],
  exports: [AuthService],
})
export class AuthModule {}
