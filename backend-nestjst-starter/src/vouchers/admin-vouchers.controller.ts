import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { Roles } from '../auth/decorators/roles.decorator';
import { RolesGuard } from '../auth/guards/roles.guard';
import { parseIdPipe } from '../common/pipes/parse-id.pipe';
import { AdminVouchersService } from './admin-vouchers.service';
import { CreateVoucherDto } from './dto/create-voucher.dto';
import { QueryAdminVouchersDto } from './dto/query-admin-vouchers.dto';
import { UpdateVoucherDto } from './dto/update-voucher.dto';
import { UpdateVoucherStatusDto } from './dto/update-voucher-status.dto';

// Chỉ ADMIN (docs/01: tạo, sửa, khóa/mở voucher). Không có DELETE: voucher không bao giờ xóa cứng, chỉ tắt.
@Controller('admin/vouchers')
@UseGuards(RolesGuard)
@Roles('ADMIN')
export class AdminVouchersController {
  constructor(private readonly adminVouchersService: AdminVouchersService) {}

  @Get()
  findAll(@Query() query: QueryAdminVouchersDto) {
    return this.adminVouchersService.findAll(query);
  }

  @Get(':id')
  findOne(@Param('id', parseIdPipe) id: number) {
    return this.adminVouchersService.findOne(id);
  }

  @Post()
  create(@Body() dto: CreateVoucherDto) {
    return this.adminVouchersService.create(dto);
  }

  @Patch(':id')
  update(@Param('id', parseIdPipe) id: number, @Body() dto: UpdateVoucherDto) {
    return this.adminVouchersService.update(id, dto);
  }

  @Patch(':id/status')
  updateStatus(
    @Param('id', parseIdPipe) id: number,
    @Body() dto: UpdateVoucherStatusDto,
  ) {
    return this.adminVouchersService.updateStatus(id, dto);
  }
}
