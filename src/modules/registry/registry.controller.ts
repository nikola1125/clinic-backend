import { Controller, Get, Query, Param } from '@nestjs/common';
import { RegistryService } from './registry.service';

@Controller('registry')
export class RegistryController {
  constructor(private service: RegistryService) {}

  @Get('doctors')
  searchDoctors(@Query() query: any) {
    return this.service.searchDoctors(query);
  }

  @Get('doctors/:slug')
  getDoctorBySlug(@Param('slug') slug: string) {
    return this.service.getDoctorBySlug(slug);
  }
}
