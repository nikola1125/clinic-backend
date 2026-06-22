import { Controller, Post, Get, Param, UseGuards } from '@nestjs/common';
import { WebsocketService } from './websocket.service';
import { AuthGuard } from '../../common/guards/auth.guard';
import { GetActor } from '../../common/decorators/actor.decorator';
import { Actor } from '../../common/interfaces/actor.interface';

@Controller('ws')
@UseGuards(AuthGuard)
export class WebsocketController {
  constructor(private readonly websocketService: WebsocketService) {}

  @Post('ticket')
  async createTicket(@GetActor() actor: Actor) {
    return this.websocketService.generateTicket(actor);
  }

  @Get('turn-credentials')
  async getTurnCredentialsDirect(@GetActor() actor: Actor) {
    return this.websocketService.getTurnCredentials(actor);
  }

  @Post('meetings/:appointmentId/end')
  async endMeeting(
    @Param('appointmentId') appointmentId: string,
    @GetActor() actor: Actor,
  ) {
    return this.websocketService.endMeeting(appointmentId, actor);
  }

  @Get('meetings/:appointmentId/turn')
  async getTurnCredentials(
    @Param('appointmentId') appointmentId: string,
    @GetActor() actor: Actor,
  ) {
    return this.websocketService.getTurnCredentials(actor);
  }
}
