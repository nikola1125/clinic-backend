import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ApplicationsController } from './applications.controller';
import { ApplicationsService } from './applications.service';
import { DoctorApplication, PartnerApplication } from '../../entities';

@Module({
  imports: [TypeOrmModule.forFeature([DoctorApplication, PartnerApplication])],
  controllers: [ApplicationsController],
  providers: [ApplicationsService],
})
export class ApplicationsModule {}
