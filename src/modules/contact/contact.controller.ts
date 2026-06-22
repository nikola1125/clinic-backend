import { Controller, Post, Body } from '@nestjs/common';
import { ContactService } from './contact.service';

@Controller('api/contact')
export class ContactController {
  constructor(private service: ContactService) {}

  @Post()
  createMessage(@Body() body: any) {
    return this.service.createMessage(body);
  }
}
