import { Injectable, CanActivate, ExecutionContext, HttpException, HttpStatus } from '@nestjs/common';
import { RedisService } from '../services/redis.service';
import { AppConfigService } from '../../config/config.service';
import * as ipaddr from 'ipaddr.js';

@Injectable()
export class RateLimitGuard implements CanActivate {
  constructor(
    private redis: RedisService,
    private config: AppConfigService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const actor = request.actor;
    const path = request.route?.path || request.url;

    let key: string;

    if (actor && actor.sub !== 'unknown') {
      key = `rl:${actor.sub}:${path}`;
    } else {
      const clientIp = request.ip || request.connection.remoteAddress;
      const forwardedFor = request.headers['x-forwarded-for'];

      let ip = clientIp;
      if (forwardedFor && this.isTrustedProxy(clientIp)) {
        ip = forwardedFor.split(',')[0].trim();
      }

      key = `rl:ip:${ip}:${path}`;
    }

    const limit = this.config.rateLimitPerMinute;
    const count = await this.redis.incr(key);

    if (count === 1) {
      await this.redis.expire(key, 60);
    }

    if (count > limit) {
      throw new HttpException('Rate limit exceeded', HttpStatus.TOO_MANY_REQUESTS);
    }

    return true;
  }

  private isTrustedProxy(ip: string): boolean {
    try {
      const addr = ipaddr.process(ip);
      const trustedNets = this.config.trustedProxies.split(',');

      for (const netStr of trustedNets) {
        const trimmed = netStr.trim();
        if (!trimmed) continue;

        try {
          if (trimmed.includes('/')) {
            const [netIp, prefixLen] = trimmed.split('/');
            const range = ipaddr.parseCIDR(`${netIp}/${prefixLen}`);
            if (addr.match(range)) return true;
          } else {
            if (addr.toString() === ipaddr.process(trimmed).toString()) return true;
          }
        } catch {}
      }
    } catch {}

    return false;
  }
}
