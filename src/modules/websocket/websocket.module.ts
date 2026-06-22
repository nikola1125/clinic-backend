import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { WebsocketGateway } from "./websocket.gateway";
import { WebsocketService } from "./websocket.service";
import { WebsocketController } from "./websocket.controller";
import { MeetController } from "./meet.controller";
import { Appointment } from "../../entities/appointment.entity";
import { Meeting } from "../../entities/meeting.entity";
import { Doctor } from "../../entities/doctor.entity";
import { Patient } from "../../entities/patient.entity";
import { ChatMessage } from "../../entities/chat-message.entity";

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Appointment,
      Meeting,
      Doctor,
      Patient,
      ChatMessage,
    ]),
  ],
  controllers: [WebsocketController, MeetController],
  providers: [WebsocketGateway, WebsocketService],
  exports: [WebsocketService],
})
export class WebsocketModule {}
