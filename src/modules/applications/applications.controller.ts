import { Controller, Post, Body } from '@nestjs/common';
import { ApplicationsService } from './applications.service';

@Controller('api/applications')
export class ApplicationsController {
  constructor(private service: ApplicationsService) {}

  @Post('doctor')
  createDoctorApplication(@Body() body: any) {
    return this.service.createDoctorApplication(body);
  }

  @Post('partner')
  createPartnerApplication(@Body() body: any) {
    return this.service.createPartnerApplication(body);
  }
}
