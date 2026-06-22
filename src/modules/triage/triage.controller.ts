import { Controller, Post, Body } from '@nestjs/common';
import { TriageService } from './triage.service';

@Controller('api/triage')
export class TriageController {
  constructor(private service: TriageService) {}

  @Post()
  analyzeSymptoms(@Body() body: { symptoms: string[] }) {
    return this.service.analyzeSymptoms(body.symptoms);
  }
}
