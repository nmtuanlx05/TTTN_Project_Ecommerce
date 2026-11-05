import { Injectable } from '@nestjs/common';
import { OrderStatus } from '../generated/prisma/enums';
import { PrismaService } from '../prisma/prisma.service';
import { PENDING_ORDERS_LIMIT } from './dashboard.constants';
import { toDashboard, toNumber } from './dashboard.mapper';
import {
  buildLowStockCountQuery,
  buildLowStockQuery,
  buildNewCustomersByDayQuery,
  buildOrdersByDayQuery,
  buildRevenueByDayQuery,
  buildTopProductsQuery,
  type CountDayRow,
  type LowStockRow,
  type RevenueDayRow,
  type TopProductRow,
  type TotalRow,
} from './dashboard.queries';
import { buildDashboardRange } from './dashboard.range';
import type { QueryDashboardDto } from './dto/query-dashboard.dto';

@Injectable()
export class DashboardService {
  constructor(private readonly prisma: PrismaService) {}

  async getDashboard(query: QueryDashboardDto) {
    const range = buildDashboardRange(query.from, query.to);

    // Một transaction: mọi số liệu cùng một lát cắt dữ liệu nên tổng series, statusCounts và thẻ KPI khớp nhau.
    // Truy vấn theo ngày quét một lần cho cả kỳ trước lẫn kỳ này (range.all) rồi tách ở mapper.
    const [
      revenueRows,
      orderRows,
      customerRows,
      statusRows,
      topRows,
      lowRows,
      lowTotalRows,
      pendingRows,
    ] = await this.prisma.$transaction([
      this.prisma.$queryRaw<RevenueDayRow[]>(buildRevenueByDayQuery(range.all)),
      this.prisma.$queryRaw<CountDayRow[]>(buildOrdersByDayQuery(range.all)),
      this.prisma.$queryRaw<CountDayRow[]>(
        buildNewCustomersByDayQuery(range.all),
      ),
      this.prisma.order.groupBy({
        by: ['status'],
        where: { createdAt: { gte: range.current.gte, lt: range.current.lt } },
        _count: { _all: true },
        orderBy: { status: 'asc' },
      }),
      this.prisma.$queryRaw<TopProductRow[]>(
        buildTopProductsQuery(range.current),
      ),
      this.prisma.$queryRaw<LowStockRow[]>(buildLowStockQuery()),
      this.prisma.$queryRaw<TotalRow[]>(buildLowStockCountQuery()),
      this.prisma.order.findMany({
        where: {
          status: { in: [OrderStatus.PENDING, OrderStatus.CONFIRMED] },
        },
        select: {
          id: true,
          code: true,
          customerName: true,
          totalAmount: true,
          status: true,
          paymentStatus: true,
          createdAt: true,
        },
        orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
        take: PENDING_ORDERS_LIMIT,
      }),
    ]);

    return toDashboard({
      range,
      revenueRows,
      orderRows,
      customerRows,
      statusRows,
      topRows,
      lowRows,
      lowTotal: toNumber(lowTotalRows[0]?.total),
      pendingRows,
    });
  }
}
