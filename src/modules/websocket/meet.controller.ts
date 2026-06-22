import { Controller, Post, Get, Param, UseGuards } from '@nestjs/common';
import { WebsocketService } from './websocket.service';
import { AuthGuard } from '../../common/guards/auth.guard';
import { GetActor } from '../../common/decorators/actor.decorator';
import { Actor } from '../../common/interfaces/actor.interface';

@Controller('meet')
@UseGuards(AuthGuard)
export class MeetController {
  constructor(private readonly websocketService: WebsocketService) {}

  @Get('context/:appointmentId')
  async getMeetContext(
    @Param('appointmentId') appointmentId: string,
    @GetActor() actor: Actor,
  ) {
    return this.websocketService.getMeetContext(appointmentId, actor);
  }

  @Post(':appointmentId/join')
  async joinMeeting(
    @Param('appointmentId') appointmentId: string,
    @GetActor() actor: Actor,
  ) {
    return this.websocketService.joinMeeting(appointmentId, actor);
  }

  @Post(':appointmentId/end')
  async endMeeting(
    @Param('appointmentId') appointmentId: string,
    @GetActor() actor: Actor,
  ) {
    return this.websocketService.endMeeting(appointmentId, actor);
  }
}
