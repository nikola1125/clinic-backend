import { Module, Global } from "@nestjs/common";
import { SecurityService } from "./security.service";
import { RedisService } from "./redis.service";
import { StorageService } from "./storage.service";
import { RlsService } from "./rls.service";

@Global()
@Module({
  providers: [SecurityService, RedisService, StorageService, RlsService],
  exports: [SecurityService, RedisService, StorageService, RlsService],
})
export class CommonServicesModule {}
