import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { Roles } from '../auth/decorators/roles.decorator';
import { RolesGuard } from '../auth/guards/roles.guard';
import { DashboardService } from './dashboard.service';
import { QueryDashboardDto } from './dto/query-dashboard.dto';

// Chỉ ADMIN (docs/01: "Báo cáo doanh thu, dashboard tổng quan"). JwtAuthGuard đã bật toàn cục.
@Controller('admin/dashboard')
@UseGuards(RolesGuard)
@Roles('ADMIN')
export class DashboardController {
  constructor(private readonly dashboardService: DashboardService) {}

  // Số liệu trang Tổng quan trong khoảng ngày [from, to] (GMT+7), so với kỳ liền trước dài bằng nhau
  @Get()
  getDashboard(@Query() query: QueryDashboardDto) {
    return this.dashboardService.getDashboard(query);
  }
}
