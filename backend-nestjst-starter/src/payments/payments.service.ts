import { Injectable, Logger } from '@nestjs/common';
import { badRequest, conflict, notFound } from '../common/errors/coded-errors';
import { Paginated } from '../common/paginated';
import { Prisma } from '../generated/prisma/client';
import {
  OrderStatus,
  PaymentMethod,
  PaymentReviewReason,
  PaymentStatus,
  PaymentTransactionStatus,
} from '../generated/prisma/enums';
import { OrderWorkflowService } from '../orders/order-workflow.service';
import {
  MAX_REASON_LENGTH,
  ORDER_ERROR,
  PAYMENT_RECEIVED_REASON,
} from '../orders/orders.constants';
import { isPrismaCode, runWithRetry } from '../orders/orders.tx';
import { PrismaService } from '../prisma/prisma.service';
import type { AuthUser } from '../auth/auth.types';
import { ConfirmPaymentDto } from './dto/confirm-payment.dto';
import { QueryPaymentTransactionsDto } from './dto/query-payment-transactions.dto';
import { ResolveTransactionDto } from './dto/resolve-transaction.dto';
import { PaymentConfigService } from './payment-config.service';
import { PAYMENT_ERROR, PAYMENT_PROVIDER } from './payments.constants';
import type { PaymentProvider } from './payments.constants';
import {
  buildTransferContent,
  buildVietQrPayload,
  extractOrderCode,
} from './vietqr';

export interface ConfirmBankTransferInput {
  // Nguồn: webhook đối soát (SEPAY) hoặc admin xác nhận thủ công (MANUAL)
  source: PaymentProvider;
  // Mã giao dịch phía nhà cung cấp; null với MANUAL
  providerTxnId: string | null;
  // VND. Với MANUAL bị bỏ qua: admin xác nhận đã nhận đủ nên ghi đúng tổng đơn
  amount: number;
  // Nội dung chuyển khoản gốc (MANUAL: ghi chú của admin)
  content: string | null;
  rawPayload?: unknown;
  // Chỉ MANUAL: đơn xác định bằng id thay vì nội dung
  orderId?: number;
  // Người xác nhận (MANUAL); webhook để trống
  actorId?: number | null;
  // Chỉ MANUAL: giao dịch đang chờ xử lý được gắn vào đơn này và đánh dấu đã xử lý
  resolveTransactionId?: number;
}

export type ConfirmResult =
  | {
      result: 'CONFIRMED';
      transactionId: number;
      orderCode: string;
      overpaid: boolean;
    }
  | {
      result: 'NEEDS_REVIEW';
      transactionId: number;
      orderCode: string | null;
      reviewReason: PaymentReviewReason;
    }
  | { result: 'DUPLICATE'; transactionId: number };

interface LockedPaymentOrder {
  id: number;
  code: string;
  status: OrderStatus;
  paymentMethod: PaymentMethod;
  paymentStatus: PaymentStatus;
  totalAmount: number;
}

const orderNotFound = () =>
  notFound(ORDER_ERROR.ORDER_NOT_FOUND, 'Không tìm thấy đơn hàng');

const truncate = (text: string, max: number) =>
  text.length > max ? text.slice(0, max) : text;

export type PaymentState =
  | 'AWAITING_PAYMENT'
  | 'PAID'
  | 'EXPIRED'
  | 'CANCELLED';

@Injectable()
export class PaymentsService {
  private readonly logger = new Logger(PaymentsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly paymentConfig: PaymentConfigService,
    private readonly workflow: OrderWorkflowService,
  ) {}

  // ===== Thông tin thanh toán cho khách =====

  // Luôn 200 cho chủ đơn online để frontend chuyển màn theo `state`. Hết hạn chỉ được TÍNH khi đọc, không ghi DB
  // (việc hủy là của tác vụ định kỳ). Thông tin tài khoản và QR chỉ trả khi đang chờ thanh toán.
  async getOrderPayment(userId: number, code: string, now = new Date()) {
    const order = await this.prisma.order.findFirst({
      where: { code, userId },
      select: {
        code: true,
        status: true,
        paymentMethod: true,
        paymentStatus: true,
        totalAmount: true,
        paymentExpiresAt: true,
        paidAt: true,
      },
    });
    if (!order) throw orderNotFound();
    if (order.paymentMethod !== PaymentMethod.ONLINE) {
      throw conflict(
        PAYMENT_ERROR.ORDER_NOT_ONLINE,
        'Đơn hàng này không thanh toán online',
      );
    }

    const base = {
      orderCode: order.code,
      amount: order.totalAmount,
      expiresAt: order.paymentExpiresAt,
      paidAt: order.paidAt,
    };
    if (order.paymentStatus === PaymentStatus.PAID) {
      return { state: 'PAID' as PaymentState, ...base };
    }
    if (order.status !== OrderStatus.PENDING_PAYMENT) {
      return { state: 'CANCELLED' as PaymentState, ...base };
    }
    if (!order.paymentExpiresAt || order.paymentExpiresAt <= now) {
      return { state: 'EXPIRED' as PaymentState, ...base };
    }

    const online = this.paymentConfig.online;
    if (!online.enabled) {
      throw conflict(
        ORDER_ERROR.PAYMENT_METHOD_NOT_SUPPORTED,
        'Thanh toán chuyển khoản tạm thời chưa khả dụng, vui lòng liên hệ cửa hàng',
      );
    }
    const content = buildTransferContent(order.code);
    return {
      state: 'AWAITING_PAYMENT' as PaymentState,
      ...base,
      transfer: {
        content,
        bank: {
          bin: online.bankBin,
          code: online.bankCode,
          name: online.bankName,
        },
        accountNo: online.accountNo,
        accountName: online.accountName,
        qrPayload: buildVietQrPayload({
          bankBin: online.bankBin,
          accountNo: online.accountNo,
          amount: order.totalAmount,
          content,
        }),
      },
    };
  }

  // ===== Hàm xác nhận chung (một nguồn sự thật) =====

  async confirmBankTransfer(
    input: ConfirmBankTransferInput,
  ): Promise<ConfirmResult> {
    // Trùng (provider, providerTxnId): trả lại giao dịch cũ, không xử lý lần hai
    if (input.providerTxnId) {
      const existing = await this.findExisting(
        input.source,
        input.providerTxnId,
      );
      if (existing) return { result: 'DUPLICATE', transactionId: existing.id };
    }

    const now = new Date();
    try {
      return await runWithRetry(
        this.prisma,
        (tx) => this.confirmInTransaction(tx, input, now),
        { isolationLevel: Prisma.TransactionIsolationLevel.ReadCommitted },
      );
    } catch (error) {
      // Hai webhook cùng id tới đồng thời: ràng buộc duy nhất ở DB chặn lần hai
      if (input.providerTxnId && isPrismaCode(error, 'P2002')) {
        const existing = await this.findExisting(
          input.source,
          input.providerTxnId,
        );
        if (existing) {
          return { result: 'DUPLICATE', transactionId: existing.id };
        }
      }
      throw error;
    }
  }

  private findExisting(provider: PaymentProvider, providerTxnId: string) {
    return this.prisma.paymentTransaction.findUnique({
      where: { provider_providerTxnId: { provider, providerTxnId } },
      select: { id: true },
    });
  }

  private async confirmInTransaction(
    tx: Prisma.TransactionClient,
    input: ConfirmBankTransferInput,
    now: Date,
  ): Promise<ConfirmResult> {
    const manual = input.source === PAYMENT_PROVIDER.MANUAL;

    // Xác định đơn: MANUAL theo id, còn lại theo mã đơn rút ra từ nội dung chuyển khoản gốc
    let orderId: number | null = input.orderId ?? null;
    if (orderId === null && !manual && input.content) {
      const code = extractOrderCode(input.content);
      if (code) {
        const found = await tx.order.findUnique({
          where: { code },
          select: { id: true },
        });
        orderId = found?.id ?? null;
      }
    }

    const order = orderId === null ? null : await this.lockOrder(tx, orderId);
    if (manual && !order) throw orderNotFound();

    const common = {
      provider: input.source,
      providerTxnId: input.providerTxnId,
      content: input.content ? truncate(input.content, 500) : null,
      // rawPayload là JSON thuần do webhook/admin cung cấp; kiểu unknown nên cần ép sang kiểu JSON của Prisma
      // eslint-disable-next-line @typescript-eslint/no-unnecessary-type-assertion
      rawData: (input.rawPayload ?? undefined) as
        | Prisma.InputJsonValue
        | undefined,
    };

    if (!order) {
      const row = await tx.paymentTransaction.create({
        data: {
          ...common,
          amount: input.amount,
          orderId: null,
          status: PaymentTransactionStatus.NEEDS_REVIEW,
          reviewReason: PaymentReviewReason.UNMATCHED,
        },
        select: { id: true },
      });
      return {
        result: 'NEEDS_REVIEW',
        transactionId: row.id,
        orderCode: null,
        reviewReason: PaymentReviewReason.UNMATCHED,
      };
    }

    const amount = manual ? order.totalAmount : input.amount;
    const reviewReason = this.reviewReasonFor(order, amount);

    if (manual) {
      if (reviewReason !== null) {
        throw conflict(
          PAYMENT_ERROR.ORDER_NOT_AWAITING_PAYMENT,
          order.paymentStatus === PaymentStatus.PAID
            ? 'Đơn hàng đã được thanh toán trước đó'
            : 'Đơn hàng không ở trạng thái chờ thanh toán online (đã hủy, hết hạn hoặc không phải đơn online)',
        );
      }
      if (input.resolveTransactionId !== undefined) {
        await this.linkPendingTransaction(
          tx,
          input.resolveTransactionId,
          order.id,
          input.actorId ?? null,
          input.content,
          now,
        );
      }
    }

    if (
      reviewReason !== null &&
      reviewReason !== PaymentReviewReason.OVERPAID
    ) {
      const row = await tx.paymentTransaction.create({
        data: {
          ...common,
          amount,
          orderId: order.id,
          status: PaymentTransactionStatus.NEEDS_REVIEW,
          reviewReason,
        },
        select: { id: true },
      });
      return {
        result: 'NEEDS_REVIEW',
        transactionId: row.id,
        orderCode: order.code,
        reviewReason,
      };
    }

    // Đủ hoặc thừa tiền: xác nhận đơn (PENDING_PAYMENT → PENDING)
    const row = await tx.paymentTransaction.create({
      data: {
        ...common,
        amount,
        orderId: order.id,
        status: PaymentTransactionStatus.SUCCESS,
        reviewReason, // OVERPAID hoặc null
      },
      select: { id: true },
    });
    const paymentRef = input.providerTxnId ?? `MANUAL-${row.id}`;
    const reason = manual
      ? truncate(
          `${PAYMENT_RECEIVED_REASON} (xác nhận thủ công: ${input.content ?? ''})`,
          MAX_REASON_LENGTH,
        )
      : PAYMENT_RECEIVED_REASON;
    await this.workflow.transition(tx, {
      orderId: order.id,
      to: OrderStatus.PENDING,
      actor: { id: input.actorId ?? null, role: 'SYSTEM' },
      reason,
      now,
      paymentRef,
    });
    return {
      result: 'CONFIRMED',
      transactionId: row.id,
      orderCode: order.code,
      overpaid: reviewReason === PaymentReviewReason.OVERPAID,
    };
  }

  // null = đủ điều kiện xác nhận; OVERPAID = xác nhận nhưng đánh dấu để admin xem
  private reviewReasonFor(
    order: LockedPaymentOrder,
    amount: number,
  ): PaymentReviewReason | null {
    if (order.paymentMethod !== PaymentMethod.ONLINE) {
      return PaymentReviewReason.UNMATCHED;
    }
    if (order.paymentStatus === PaymentStatus.PAID) {
      return PaymentReviewReason.DUPLICATE_PAID;
    }
    // Hủy hoặc đã hết hạn và bị hệ thống hủy: không mở lại. Đơn còn PENDING_PAYMENT dù quá hạn (tác vụ chưa chạy) vẫn nhận.
    if (order.status !== OrderStatus.PENDING_PAYMENT) {
      return PaymentReviewReason.ORDER_CLOSED;
    }
    if (amount < order.totalAmount) return PaymentReviewReason.UNDERPAID;
    if (amount > order.totalAmount) return PaymentReviewReason.OVERPAID;
    return null;
  }

  private async lockOrder(tx: Prisma.TransactionClient, orderId: number) {
    const [row] = await tx.$queryRaw<LockedPaymentOrder[]>(
      Prisma.sql`SELECT id, code, status, paymentMethod, paymentStatus, totalAmount FROM orders WHERE id = ${orderId} FOR UPDATE`,
    );
    return row
      ? { ...row, id: Number(row.id), totalAmount: Number(row.totalAmount) }
      : null;
  }

  private async linkPendingTransaction(
    tx: Prisma.TransactionClient,
    transactionId: number,
    orderId: number,
    actorId: number | null,
    note: string | null,
    now: Date,
  ) {
    const txn = await tx.paymentTransaction.findUnique({
      where: { id: transactionId },
      select: { id: true, orderId: true, reviewReason: true, resolvedAt: true },
    });
    if (!txn) {
      throw notFound(
        PAYMENT_ERROR.PAYMENT_TXN_NOT_FOUND,
        'Không tìm thấy giao dịch',
      );
    }
    if (txn.reviewReason === null) {
      throw conflict(
        PAYMENT_ERROR.PAYMENT_TXN_NOT_REVIEWABLE,
        'Giao dịch này không nằm trong danh sách cần xử lý',
      );
    }
    if (txn.resolvedAt !== null) {
      throw conflict(
        PAYMENT_ERROR.PAYMENT_TXN_ALREADY_RESOLVED,
        'Giao dịch này đã được xử lý trước đó',
      );
    }
    if (txn.orderId !== null && txn.orderId !== orderId) {
      throw badRequest(
        PAYMENT_ERROR.PAYMENT_TXN_ORDER_MISMATCH,
        'Giao dịch đang gắn với một đơn khác',
      );
    }
    await tx.paymentTransaction.update({
      where: { id: transactionId },
      data: {
        orderId,
        resolvedAt: now,
        resolvedById: actorId,
        resolutionNote: note ? truncate(note, 500) : null,
      },
    });
  }

  // ===== Admin =====

  // Xác nhận thủ công (dự phòng khi webhook không tới, giao dịch thiếu tiền hoặc không khớp)
  async confirmManually(
    orderId: number,
    dto: ConfirmPaymentDto,
    actor: AuthUser,
  ) {
    const result = await this.confirmBankTransfer({
      source: PAYMENT_PROVIDER.MANUAL,
      providerTxnId: null,
      amount: 0,
      content: dto.note,
      rawPayload: { note: dto.note, confirmedBy: actor.id },
      orderId,
      actorId: actor.id,
      resolveTransactionId: dto.transactionId,
    });
    this.logger.log(`Admin ${actor.id} xác nhận thủ công đơn ${orderId}`);
    return result;
  }

  async listTransactions(query: QueryPaymentTransactionsDto) {
    const { page, limit, review } = query;
    const where: Prisma.PaymentTransactionWhereInput = {
      reviewReason: { not: null },
      ...(review === 'pending' && { resolvedAt: null }),
      ...(review === 'resolved' && { resolvedAt: { not: null } }),
    };
    const [rows, total] = await this.prisma.$transaction([
      this.prisma.paymentTransaction.findMany({
        where,
        // Không chọn rawData (có thể chứa số tài khoản)
        select: {
          id: true,
          provider: true,
          providerTxnId: true,
          amount: true,
          content: true,
          status: true,
          reviewReason: true,
          resolvedAt: true,
          resolutionNote: true,
          createdAt: true,
          order: {
            select: { id: true, code: true, status: true, totalAmount: true },
          },
          resolvedBy: { select: { id: true, name: true } },
        },
        orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.prisma.paymentTransaction.count({ where }),
    ]);
    return new Paginated(rows, { page, limit, total });
  }

  // Đánh dấu "đã xử lý ngoài hệ thống" (vd hoàn tiền thủ công). Không đổi trạng thái đơn.
  async resolveTransaction(
    id: number,
    dto: ResolveTransactionDto,
    actor: AuthUser,
  ) {
    const txn = await this.prisma.paymentTransaction.findUnique({
      where: { id },
      select: { id: true, reviewReason: true },
    });
    if (!txn) {
      throw notFound(
        PAYMENT_ERROR.PAYMENT_TXN_NOT_FOUND,
        'Không tìm thấy giao dịch',
      );
    }
    if (txn.reviewReason === null) {
      throw conflict(
        PAYMENT_ERROR.PAYMENT_TXN_NOT_REVIEWABLE,
        'Giao dịch này không nằm trong danh sách cần xử lý',
      );
    }
    // updateMany có điều kiện resolvedAt IS NULL: hai admin bấm cùng lúc thì chỉ một người thành công
    const { count } = await this.prisma.paymentTransaction.updateMany({
      where: { id, resolvedAt: null },
      data: {
        resolvedAt: new Date(),
        resolvedById: actor.id,
        resolutionNote: dto.note,
      },
    });
    if (count !== 1) {
      throw conflict(
        PAYMENT_ERROR.PAYMENT_TXN_ALREADY_RESOLVED,
        'Giao dịch này đã được xử lý trước đó',
      );
    }
    return { id, resolved: true };
  }
}
