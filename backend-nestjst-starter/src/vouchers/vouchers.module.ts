import { Module } from '@nestjs/common';
import { RolesGuard } from '../auth/guards/roles.guard';
import { AdminVouchersController } from './admin-vouchers.controller';
import { AdminVouchersService } from './admin-vouchers.service';
import { VouchersController } from './vouchers.controller';
import { VouchersService } from './vouchers.service';

@Module({
  controllers: [VouchersController, AdminVouchersController],
  providers: [VouchersService, AdminVouchersService, RolesGuard],
})
export class VouchersModule {}
