import { Injectable } from '@nestjs/common';
import { badRequest, notFound } from '../common/errors/coded-errors';
import { Paginated } from '../common/paginated';
import { parseVnDate } from '../common/utils/vn-date';
import { Prisma } from '../generated/prisma/client';
import { OrderStatus } from '../generated/prisma/enums';
import { PrismaService } from '../prisma/prisma.service';
import type { AuthUser } from '../auth/auth.types';
import { QueryAdminOrdersDto } from './dto/query-admin-orders.dto';
import { UpdateOrderStatusDto } from './dto/update-order-status.dto';
import { OrderWorkflowService } from './order-workflow.service';
import { ORDER_ERROR } from './orders.constants';
import {
  adminOrderSelect,
  orderListSelect,
  toAdminOrder,
  toOrderListItem,
} from './orders.mapper';
import { runWithRetry } from './orders.tx';

const orderNotFound = () =>
  notFound(ORDER_ERROR.ORDER_NOT_FOUND, 'Không tìm thấy đơn hàng');

@Injectable()
export class AdminOrdersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly workflow: OrderWorkflowService,
  ) {}

  async findAll(query: QueryAdminOrdersDto) {
    const { page, limit, status, sortBy, order, from, to, q } = query;

    const createdAt: Prisma.DateTimeFilter = {};
    if (from) createdAt.gte = parseVnDate(from, false, 'from');
    if (to) createdAt.lte = parseVnDate(to, true, 'to');
    if (createdAt.gte && createdAt.lte && createdAt.gte > createdAt.lte) {
      throw badRequest('INVALID_DATE_RANGE', 'from không được sau to');
    }

    const where: Prisma.OrderWhereInput = {
      ...(status && { status }),
      ...(from || to ? { createdAt } : {}),
      ...(q && {
        OR: [
          { code: { contains: q } },
          { customerPhone: { contains: q } },
          { customerName: { contains: q } },
        ],
      }),
    };

    // Danh sách và tổng trong một transaction, cùng điều kiện lọc
    const [rows, total] = await this.prisma.$transaction([
      this.prisma.order.findMany({
        where,
        select: orderListSelect,
        orderBy: [{ [sortBy]: order }, { id: order }],
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.prisma.order.count({ where }),
    ]);
    return new Paginated(rows.map(toOrderListItem), { page, limit, total });
  }

  async findOne(id: number) {
    const row = await this.prisma.order.findUnique({
      where: { id },
      select: adminOrderSelect,
    });
    if (!row) throw orderNotFound();
    return toAdminOrder(row);
  }

  async updateStatus(id: number, dto: UpdateOrderStatusDto, actor: AuthUser) {
    if (dto.status === OrderStatus.CANCELLED && !dto.reason) {
      throw badRequest(
        ORDER_ERROR.ORDER_CANCEL_REASON_REQUIRED,
        'Vui lòng nhập lý do hủy đơn',
      );
    }
    const now = new Date();
    await runWithRetry(this.prisma, (tx) =>
      this.workflow.transition(tx, {
        orderId: id,
        to: dto.status,
        actor: {
          id: actor.id,
          role: actor.role === 'ADMIN' ? 'ADMIN' : 'STAFF',
        },
        reason: dto.reason ?? null,
        now,
      }),
    );
    return this.findOne(id);
  }
}
