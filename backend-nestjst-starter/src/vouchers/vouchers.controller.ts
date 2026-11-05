import { Controller, Get, UseGuards } from '@nestjs/common';
import { Roles, RolesMessage } from '../auth/decorators/roles.decorator';
import { RolesGuard } from '../auth/guards/roles.guard';
import { VouchersService } from './vouchers.service';

// Voucher khả dụng cho giao diện thanh toán: chỉ CUSTOMER, như các route mua hàng
@Controller('vouchers')
@UseGuards(RolesGuard)
@Roles('CUSTOMER')
@RolesMessage('Tài khoản quản trị không dùng để mua hàng')
export class VouchersController {
  constructor(private readonly vouchersService: VouchersService) {}

  @Get('available')
  findAvailable() {
    return this.vouchersService.findAvailable();
  }
}
