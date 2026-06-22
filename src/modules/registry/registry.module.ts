import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { RegistryController } from './registry.controller';
import { RegistryService } from './registry.service';
import { Doctor } from '../../entities';

@Module({
  imports: [TypeOrmModule.forFeature([Doctor])],
  controllers: [RegistryController],
  providers: [RegistryService],
})
export class RegistryModule {}
