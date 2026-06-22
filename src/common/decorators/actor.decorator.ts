import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { Actor } from '../interfaces/actor.interface';

export const GetActor = createParamDecorator(
  (data: unknown, ctx: ExecutionContext): Actor => {
    const request = ctx.switchToHttp().getRequest();
    return request.actor;
  },
);
