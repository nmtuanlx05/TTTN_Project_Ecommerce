import { Controller, Get, Header, Param } from '@nestjs/common';
import { Public } from '../auth/decorators/public.decorator';
import { LocationsService } from './locations.service';

// Công khai, chỉ đọc, dữ liệu gần như bất biến nên cho cache 1 ngày ở trình duyệt/CDN
const CACHE = 'public, max-age=86400';

@Public()
@Controller('locations')
export class LocationsController {
  constructor(private readonly locationsService: LocationsService) {}

  @Get('provinces')
  @Header('Cache-Control', CACHE)
  getProvinces() {
    return this.locationsService.getProvinces();
  }

  @Get('provinces/:provinceCode/districts')
  @Header('Cache-Control', CACHE)
  getDistricts(@Param('provinceCode') provinceCode: string) {
    return this.locationsService.getDistricts(provinceCode);
  }

  @Get('districts/:districtCode/wards')
  @Header('Cache-Control', CACHE)
  getWards(@Param('districtCode') districtCode: string) {
    return this.locationsService.getWards(districtCode);
  }
}
