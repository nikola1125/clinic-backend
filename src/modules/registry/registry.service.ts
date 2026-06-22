import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Like } from 'typeorm';
import { Doctor } from '../../entities';

@Injectable()
export class RegistryService {
  constructor(@InjectRepository(Doctor) private doctorRepo: Repository<Doctor>) {}

  async searchDoctors(filters: any) {
    const where: any = { deletedAt: null as any };
    if (filters.specialty) where.specialty = Like(`%${filters.specialty}%`);
    if (filters.country) where.country = filters.country;
    const doctors = await this.doctorRepo.find({ where, take: filters.limit || 50, skip: filters.offset || 0 });
    return { doctors, total: doctors.length };
  }

  async getDoctorBySlug(slug: string) {
    return this.doctorRepo.findOne({ where: { slug } });
  }
}
