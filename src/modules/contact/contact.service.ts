import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ContactMessage } from '../../entities';

@Injectable()
export class ContactService {
  constructor(@InjectRepository(ContactMessage) private contactRepo: Repository<ContactMessage>) {}

  async createMessage(data: any) {
    const msg = this.contactRepo.create(data);
    return this.contactRepo.save(msg);
  }
}
