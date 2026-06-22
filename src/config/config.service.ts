import { Injectable } from '@nestjs/common';
import { ConfigService as NestConfigService } from '@nestjs/config';

@Injectable()
export class AppConfigService {
  constructor(private configService: NestConfigService) {}

  get databaseUrl(): string {
    let url = this.configService.get<string>('DATABASE_URL', '');
    if (url.startsWith('postgres://')) {
      url = 'postgresql://' + url.substring('postgres://'.length);
    }
    return url;
  }

  get redisUrl(): string {
    return this.configService.get<string>('REDIS_URL', 'redis://localhost:6379');
  }

  get corsOrigins(): string {
    return this.configService.get<string>('CORS_ORIGINS', 'http://localhost:3000');
  }

  get docsEnabled(): boolean {
    return this.configService.get<string>('DOCS_ENABLED', 'false') === 'true';
  }

  get supabaseUrl(): string {
    return this.configService.get<string>('SUPABASE_URL', '');
  }

  get supabaseServiceRoleKey(): string {
    return this.configService.get<string>('SUPABASE_SERVICE_ROLE_KEY', '');
  }

  get supabaseJwtSecret(): string {
    return this.configService.get<string>('SUPABASE_JWT_SECRET', '');
  }

  get jwtSecretKey(): string {
    return this.configService.get<string>('JWT_SECRET_KEY', '');
  }

  get jwtAlgorithm(): string {
    return this.configService.get<string>('JWT_ALGORITHM', 'HS256');
  }

  get jwtExpireMinutes(): number {
    return parseInt(this.configService.get<string>('JWT_EXPIRE_MINUTES', '30'), 10);
  }

  get jwtRefreshSecretKey(): string {
    return this.configService.get<string>('JWT_REFRESH_SECRET_KEY', '');
  }

  get jwtRefreshExpireMinutes(): number {
    return parseInt(this.configService.get<string>('JWT_REFRESH_EXPIRE_MINUTES', '10080'), 10);
  }

  get adminSeedEmail(): string {
    return this.configService.get<string>('ADMIN_SEED_EMAIL', 'admin@clinic.com');
  }

  get adminSeedPassword(): string {
    return this.configService.get<string>('ADMIN_SEED_PASSWORD', '');
  }

  get serviceApiKeys(): string {
    return this.configService.get<string>('SERVICE_API_KEYS', '');
  }

  get rateLimitPerMinute(): number {
    return parseInt(this.configService.get<string>('RATE_LIMIT_PER_MINUTE', '60'), 10);
  }

  get trustedProxies(): string {
    return this.configService.get<string>('TRUSTED_PROXIES', '127.0.0.1,10.0.0.0/8,172.16.0.0/12,192.168.0.0/16');
  }

  get allowedImageHosts(): string {
    return this.configService.get<string>('ALLOWED_IMAGE_HOSTS', '');
  }

  get turnMode(): string {
    return this.configService.get<string>('TURN_MODE', 'hmac');
  }

  get turnMeteredSecretKey(): string {
    return this.configService.get<string>('TURN_METERED_SECRET_KEY', '');
  }

  get turnMeteredDomain(): string {
    return this.configService.get<string>('TURN_METERED_DOMAIN', '');
  }

  get turnSecret(): string {
    return this.configService.get<string>('TURN_SECRET', '');
  }

  get turnStaticUsername(): string {
    return this.configService.get<string>('TURN_STATIC_USERNAME', '');
  }

  get turnStaticPassword(): string {
    return this.configService.get<string>('TURN_STATIC_PASSWORD', '');
  }

  get turnStaticUris(): string {
    return this.configService.get<string>('TURN_STATIC_URIS', '');
  }

  get turnHost(): string {
    return this.configService.get<string>('TURN_HOST', 'localhost');
  }

  get turnRealm(): string {
    return this.configService.get<string>('TURN_REALM', 'localhost');
  }

  get turnPort(): number {
    return parseInt(this.configService.get<string>('TURN_PORT', '3478'), 10);
  }

  get turnTlsPort(): number {
    return parseInt(this.configService.get<string>('TURN_TLS_PORT', '5349'), 10);
  }

  get turnTlsEnabled(): boolean {
    return this.configService.get<string>('TURN_TLS_ENABLED', 'false') === 'true';
  }

  get turnTtlSeconds(): number {
    return parseInt(this.configService.get<string>('TURN_TTL_SECONDS', '3600'), 10);
  }

  get meetingJoinWindowBeforeMinutes(): number {
    return parseInt(this.configService.get<string>('MEETING_JOIN_WINDOW_BEFORE_MINUTES', '15'), 10);
  }

  get meetingJoinWindowAfterMinutes(): number {
    return parseInt(this.configService.get<string>('MEETING_JOIN_WINDOW_AFTER_MINUTES', '120'), 10);
  }

  get meetingSkipJoinWindowCheck(): boolean {
    return this.configService.get<string>('MEETING_SKIP_JOIN_WINDOW_CHECK', 'false') === 'true';
  }
}
