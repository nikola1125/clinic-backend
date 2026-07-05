import { SetMetadata } from '@nestjs/common';

export const RATE_LIMIT_KEY = 'rate_limit_per_minute';

/**
 * Override the global per-minute rate limit for a route.
 * Use on expensive endpoints (e.g. bcrypt-heavy auth) to keep a request
 * flood on one route from starving CPU for the whole app.
 */
export const RateLimit = (perMinute: number) =>
  SetMetadata(RATE_LIMIT_KEY, perMinute);
