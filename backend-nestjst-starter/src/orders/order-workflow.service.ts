import { ConflictException, Injectable } from '@nestjs/common';
import { conflict, notFound } from '../common/errors/coded-errors';
import { Prisma } from '../generated/prisma/client';
import {
  OrderStatus,
  PaymentMethod,
  PaymentStatus,
} from '../generated/prisma/enums';
import { InventoryService } from '../inventory/inventory.service';
import { ORDER_ERROR } from './orders.constants';
import { getTransitionActors } from './orders.rules';
import type { OrderActor } from './orders.rules';

export const ORDER_STATUS_LABEL: Record<OrderStatus, string> = {
  PENDING: 'Chờ xác nhận',
  CONFIRMED: 'Đã xác nhận',
  SHIPPING: 'Đang giao',
  COMPLETED: 'Đã giao',
  CANCELLED: 'Đã hủy',
  RETURNED: 'Hoàn hàng',
  PENDING_PAYMENT: 'Chờ thanh toán',
};

interface LockedOrder {
  id: number;
  code: string;
  status: OrderStatus;
  voucherId: number | null;
  paymentMethod: PaymentMethod;
  paymentStatus: PaymentStatus;
}

export interface TransitionInput {
  orderId: number;
  to: OrderStatus;
  actor: { id: number; role: OrderActor };
  reason: string | null;
  now: Date;
}

// Đổi trạng thái đơn kèm toàn bộ hiệu ứng lên tồn kho và lượt voucher, trong transaction của caller.
// Thứ tự khóa cố định: đơn → các biến thể theo id tăng dần → voucher.
// Kiểm trạng thái SAU khi khóa đơn nên hai request hủy đồng thời chỉ một request thành công (không trừ lượt hai lần).
@Injectable()
export class OrderWorkflowService {
  constructor(private readonly inventory: InventoryService) {}

  async transition(tx: Prisma.TransactionClient, input: TransitionInput) {
    const { orderId, to, actor, reason, now } = input;

    const [order] = await tx.$queryRaw<LockedOrder[]>(
      Prisma.sql`SELECT id, code, status, voucherId, paymentMethod, paymentStatus FROM orders WHERE id = ${orderId} FOR UPDATE`,
    );
    if (!order) {
      throw notFound(ORDER_ERROR.ORDER_NOT_FOUND, 'Không tìm thấy đơn hàng');
    }
    const from = order.status;
    this.assertAllowed(from, to, actor.role);

    const items = await tx.orderItem.findMany({
      where: { orderId },
      select: { variantId: true, quantity: true },
      orderBy: { variantId: 'asc' },
    });

    const data: Prisma.OrderUncheckedUpdateInput = { status: to };

    switch (to) {
      case OrderStatus.CANCELLED:
        await this.releaseReserved(tx, items);
        if (order.voucherId !== null) {
          // Hoàn một lượt; không xuống dưới 0. Voucher đã bị xóa cứng thì voucherId là NULL nên không vào đây.
          await tx.$executeRaw(
            Prisma.sql`UPDATE vouchers SET usedCount = usedCount - 1 WHERE id = ${order.voucherId} AND usedCount > 0`,
          );
        }
        data.cancelReason = reason;
        break;
      case OrderStatus.CONFIRMED:
        // Chỉ gán một lần, khi xác nhận đơn
        data.handledById = actor.id;
        break;
      case OrderStatus.SHIPPING:
        for (const item of items) {
          await this.inventory.shipOut(
            tx,
            item.variantId,
            item.quantity,
            actor.id,
            order.code,
          );
        }
        break;
      case OrderStatus.COMPLETED:
        // COD: giao thành công nghĩa là đã thu tiền
        if (
          order.paymentMethod === PaymentMethod.COD &&
          order.paymentStatus === PaymentStatus.UNPAID
        ) {
          data.paymentStatus = PaymentStatus.PAID;
          data.paidAt = now;
        }
        break;
      default:
        break;
    }

    await tx.order.update({ where: { id: orderId }, data });
    await tx.orderStatusHistory.create({
      data: {
        orderId,
        fromStatus: from,
        toStatus: to,
        actorId: actor.id,
        reason,
      },
    });
  }

  private assertAllowed(from: OrderStatus, to: OrderStatus, role: OrderActor) {
    // Khách chỉ hủy được khi chờ xác nhận; trạng thái khác trả 409 với mã riêng
    if (role === 'CUSTOMER' && to === OrderStatus.CANCELLED) {
      if (from === OrderStatus.CANCELLED) {
        throw conflict(
          ORDER_ERROR.ORDER_INVALID_TRANSITION,
          'Đơn hàng đã được hủy trước đó',
        );
      }
      if (from !== OrderStatus.PENDING) {
        throw conflict(
          ORDER_ERROR.ORDER_NOT_CANCELLABLE_BY_CUSTOMER,
          'Đơn hàng đã được xác nhận hoặc đang xử lý, không thể tự hủy. Vui lòng liên hệ cửa hàng',
        );
      }
    }
    const actors = getTransitionActors(from, to);
    if (!actors || !actors.includes(role)) {
      throw conflict(
        ORDER_ERROR.ORDER_INVALID_TRANSITION,
        `Không thể chuyển đơn từ "${ORDER_STATUS_LABEL[from]}" sang "${ORDER_STATUS_LABEL[to]}"`,
      );
    }
  }

  // Khóa các biến thể theo id tăng dần rồi giảm reserved có điều kiện, kiểm số dòng bị ảnh hưởng
  private async releaseReserved(
    tx: Prisma.TransactionClient,
    items: { variantId: number; quantity: number }[],
  ) {
    if (items.length === 0) return;
    await tx.$queryRaw(
      Prisma.sql`SELECT id FROM product_variants WHERE id IN (${Prisma.join(items.map((i) => i.variantId))}) ORDER BY id FOR UPDATE`,
    );
    for (const item of items) {
      const affected = await tx.$executeRaw(
        Prisma.sql`UPDATE product_variants SET reserved = reserved - ${item.quantity} WHERE id = ${item.variantId} AND reserved >= ${item.quantity}`,
      );
      if (affected !== 1) {
        throw new ConflictException(
          'Dữ liệu tồn kho không nhất quán, không thể hủy đơn. Vui lòng liên hệ quản trị',
        );
      }
    }
  }
}
