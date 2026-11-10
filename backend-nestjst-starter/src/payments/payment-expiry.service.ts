import { Injectable, Logger } from '@nestjs/common';
import { Prisma } from '../generated/prisma/client';
import { OrderStatus, PaymentStatus } from '../generated/prisma/enums';
import { OrderWorkflowService } from '../orders/order-workflow.service';
import { PAYMENT_EXPIRED_REASON } from '../orders/orders.constants';
import { runWithRetry } from '../orders/orders.tx';
import { PrismaService } from '../prisma/prisma.service';

export const EXPIRY_BATCH_SIZE = 50;

// Hủy đơn online quá hạn thanh toán bằng ĐÚNG đường hủy sẵn có (OrderWorkflowService: nhả reserved, hoàn voucher, ghi lịch sử).
// Không phụ thuộc @nestjs/schedule (phần lập lịch nằm ở payment-expiry.cron.ts) nên test được độc lập.
// An toàn khi chạy song song nhiều tiến trình/đua với xác nhận: mỗi đơn khóa FOR UPDATE rồi KIỂM LẠI điều kiện, đơn đã
// được xác nhận hoặc đã hủy thì bỏ qua. Chạy trùng chỉ tốn công, không sai dữ liệu.
@Injectable()
export class PaymentExpiryService {
  private readonly logger = new Logger(PaymentExpiryService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly workflow: OrderWorkflowService,
  ) {}

  async expireOverdueOrders(now = new Date()) {
    const due = await this.prisma.order.findMany({
      where: {
        status: OrderStatus.PENDING_PAYMENT,
        paymentStatus: PaymentStatus.UNPAID,
        paymentExpiresAt: { lte: now },
      },
      select: { id: true },
      orderBy: { id: 'asc' },
      take: EXPIRY_BATCH_SIZE,
    });

    let expired = 0;
    let skipped = 0;
    let failed = 0;
    for (const { id } of due) {
      try {
        const done = await runWithRetry(this.prisma, async (tx) => {
          const [row] = await tx.$queryRaw<
            {
              status: OrderStatus;
              paymentStatus: PaymentStatus;
              paymentExpiresAt: Date | null;
            }[]
          >(
            Prisma.sql`SELECT status, paymentStatus, paymentExpiresAt FROM orders WHERE id = ${id} FOR UPDATE`,
          );
          // Kiểm lại sau khi khóa: có thể vừa được xác nhận thanh toán hoặc bị hủy
          if (
            !row ||
            row.status !== OrderStatus.PENDING_PAYMENT ||
            row.paymentStatus !== PaymentStatus.UNPAID ||
            !row.paymentExpiresAt ||
            new Date(row.paymentExpiresAt) > now
          ) {
            return false;
          }
          await this.workflow.transition(tx, {
            orderId: id,
            to: OrderStatus.CANCELLED,
            actor: { id: null, role: 'SYSTEM' },
            reason: PAYMENT_EXPIRED_REASON,
            now,
          });
          return true;
        });
        if (done) expired += 1;
        else skipped += 1;
      } catch (error) {
        failed += 1;
        // Một đơn lỗi không chặn các đơn khác; lần chạy sau sẽ thử lại
        this.logger.error(
          `Không hủy được đơn quá hạn id=${id}: ${error instanceof Error ? error.message : 'lỗi không xác định'}`,
        );
      }
    }
    if (expired + failed > 0) {
      this.logger.log(
        `Hết hạn thanh toán: hủy ${expired}, bỏ qua ${skipped}, lỗi ${failed}`,
      );
    }
    return { expired, skipped, failed };
  }
}
