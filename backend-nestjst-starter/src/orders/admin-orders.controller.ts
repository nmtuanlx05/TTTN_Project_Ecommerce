import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Query,
  UseGuards,
} from '@nestjs/common';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { Roles } from '../auth/decorators/roles.decorator';
import { RolesGuard } from '../auth/guards/roles.guard';
import type { AuthUser } from '../auth/auth.types';
import { parseIdPipe } from '../common/pipes/parse-id.pipe';
import { QueryAdminOrdersDto } from './dto/query-admin-orders.dto';
import { UpdateOrderStatusDto } from './dto/update-order-status.dto';
import { AdminOrdersService } from './admin-orders.service';

// ADMIN và STAFF xử lý mọi đơn (docs/01)
@Controller('admin/orders')
@UseGuards(RolesGuard)
@Roles('ADMIN', 'STAFF')
export class AdminOrdersController {
  constructor(private readonly adminOrdersService: AdminOrdersService) {}

  @Get()
  findAll(@Query() query: QueryAdminOrdersDto) {
    return this.adminOrdersService.findAll(query);
  }

  @Get(':id')
  findOne(@Param('id', parseIdPipe) id: number) {
    return this.adminOrdersService.findOne(id);
  }

  @Patch(':id/status')
  updateStatus(
    @Param('id', parseIdPipe) id: number,
    @Body() dto: UpdateOrderStatusDto,
    @CurrentUser() user: AuthUser,
  ) {
    return this.adminOrdersService.updateStatus(id, dto, user);
  }
}
