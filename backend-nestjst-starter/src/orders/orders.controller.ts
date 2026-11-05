import {
  Body,
  Controller,
  Get,
  Headers,
  Param,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { Roles, RolesMessage } from '../auth/decorators/roles.decorator';
import { RolesGuard } from '../auth/guards/roles.guard';
import type { AuthUser } from '../auth/auth.types';
import { CancelOrderDto } from './dto/cancel-order.dto';
import { CreateOrderDto } from './dto/create-order.dto';
import { PreviewOrderDto } from './dto/preview-order.dto';
import { QueryMyOrdersDto } from './dto/query-orders.dto';
import { OrdersService } from './orders.service';

// Đơn của khách: chỉ CUSTOMER, id luôn lấy từ token. Route cố định (preview) đặt trước route có :code.
@Controller('orders')
@UseGuards(RolesGuard)
@Roles('CUSTOMER')
@RolesMessage('Tài khoản quản trị không dùng để mua hàng')
export class OrdersController {
  constructor(private readonly ordersService: OrdersService) {}

  @Post('preview')
  preview(@Body() dto: PreviewOrderDto, @CurrentUser() user: AuthUser) {
    return this.ordersService.preview(user.id, dto);
  }

  // Header Idempotency-Key tùy chọn: gửi lại cùng key trả đúng đơn đã tạo
  @Post()
  create(
    @Body() dto: CreateOrderDto,
    @CurrentUser() user: AuthUser,
    @Headers('idempotency-key') idempotencyKey?: string,
  ) {
    return this.ordersService.create(user, dto, idempotencyKey);
  }

  @Get()
  findAll(@Query() query: QueryMyOrdersDto, @CurrentUser() user: AuthUser) {
    return this.ordersService.findMine(user.id, query);
  }

  // Đặt trước ':code' để 'summary' không bị hiểu là mã đơn
  @Get('summary')
  summary(@CurrentUser() user: AuthUser) {
    return this.ordersService.summaryMine(user.id);
  }

  @Get(':code')
  findOne(@Param('code') code: string, @CurrentUser() user: AuthUser) {
    return this.ordersService.findMineByCode(user.id, code);
  }

  // Đưa các dòng của đơn vào giỏ (cùng quy tắc giỏ hàng); dòng không thêm được nằm trong `skipped`
  @Post(':code/reorder')
  reorder(@Param('code') code: string, @CurrentUser() user: AuthUser) {
    return this.ordersService.reorderMine(user.id, code);
  }

  @Post(':code/cancel')
  cancel(
    @Param('code') code: string,
    @Body() dto: CancelOrderDto,
    @CurrentUser() user: AuthUser,
  ) {
    return this.ordersService.cancelMine(user.id, code, dto);
  }
}
