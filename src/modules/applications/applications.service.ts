import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { DoctorApplication, PartnerApplication } from '../../entities';

@Injectable()
export class ApplicationsService {
  constructor(
    @InjectRepository(DoctorApplication) private doctorAppRepo: Repository<DoctorApplication>,
    @InjectRepository(PartnerApplication) private partnerAppRepo: Repository<PartnerApplication>,
  ) {}

  async createDoctorApplication(data: any) {
    const app = this.doctorAppRepo.create(data);
    return this.doctorAppRepo.save(app);
  }

  async createPartnerApplication(data: any) {
    const app = this.partnerAppRepo.create(data);
    return this.partnerAppRepo.save(app);
  }
}
