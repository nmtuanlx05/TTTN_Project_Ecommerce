import { Module } from '@nestjs/common';
import { RolesGuard } from '../auth/guards/roles.guard';
import { VouchersController } from './vouchers.controller';
import { VouchersService } from './vouchers.service';

@Module({
  controllers: [VouchersController],
  providers: [VouchersService, RolesGuard],
})
export class VouchersModule {}
