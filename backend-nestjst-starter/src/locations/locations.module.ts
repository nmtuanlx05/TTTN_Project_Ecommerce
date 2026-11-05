import { Module } from '@nestjs/common';
import { LocationsController } from './locations.controller';
import { LocationsService } from './locations.service';

@Module({
  controllers: [LocationsController],
  providers: [LocationsService],
  // Module đơn hàng dùng resolveAddress khi đặt đơn
  exports: [LocationsService],
})
export class LocationsModule {}
