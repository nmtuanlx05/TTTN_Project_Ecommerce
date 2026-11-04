import { Module } from '@nestjs/common';
import { RolesGuard } from '../auth/guards/roles.guard';
import { CartController } from './cart.controller';
import { CartService } from './cart.service';

@Module({
  controllers: [CartController],
  providers: [CartService, RolesGuard],
  // Module đơn hàng sau này đọc và dọn giỏ khi đặt đơn
  exports: [CartService],
})
export class CartModule {}
