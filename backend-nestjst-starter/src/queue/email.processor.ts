import { Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { OnWorkerEvent, Processor, WorkerHost } from '@nestjs/bullmq';
import type { Job } from 'bullmq';
import { parseFrontendUrl } from '../mail/mail.config';
import { MailService } from '../mail/mail.service';
import {
  HERO_IMAGE_URL,
  WELCOME_VOUCHER_CODE,
} from '../mail/templates/mail-assets';
import {
  type OrderConfirmationPayment,
  renderOrderConfirmation,
} from '../mail/templates/order-confirmation.template';
import { renderPaymentReceived } from '../mail/templates/payment-received.template';
import { renderWelcome } from '../mail/templates/welcome.template';
import {
  OrderStatus,
  PaymentMethod,
  PaymentStatus,
} from '../generated/prisma/enums';
import { FREE_SHIPPING_THRESHOLD } from '../orders/orders.constants';
import { getVoucherStatus } from '../orders/vouchers.rules';
import { PrismaService } from '../prisma/prisma.service';
import {
  EMAIL_JOB,
  EMAIL_QUEUE,
  type OrderMailJobData,
  REDIS_ERROR_LOG_INTERVAL_MS,
  type WelcomeJobData,
} from './queue.constants';
import { ThrottledErrorLogger } from './throttled-error-logger';

// Trường đơn mà thư "Đã nhận đơn hàng" được phép đọc. KHÔNG đọc customerPhone, addressLine, note, shippingAddress
// (thư chỉ có địa chỉ rút gọn). Dòng hàng là snapshot order_items (không join lại bảng sản phẩm).
const orderMailSelect = {
  code: true,
  status: true,
  paymentMethod: true,
  paymentStatus: true,
  paymentExpiresAt: true,
  createdAt: true,
  customerEmail: true,
  customerName: true,
  wardName: true,
  districtName: true,
  provinceName: true,
  subtotal: true,
  discountAmount: true,
  voucherCode: true,
  shippingFee: true,
  totalAmount: true,
  items: {
    select: {
      productName: true,
      size: true,
      color: true,
      quantity: true,
      price: true,
      imageUrl: true,
    },
    orderBy: { id: 'asc' },
  },
} as const;

// Trường đơn mà thư "Đã nhận thanh toán" được phép đọc: không cần địa chỉ (kể cả rút gọn), không đọc SĐT, số nhà, ghi chú.
// Dòng hàng không có ảnh (thư này không hiển thị ảnh).
const paymentMailSelect = {
  code: true,
  status: true,
  paymentMethod: true,
  paymentStatus: true,
  paidAt: true,
  customerEmail: true,
  customerName: true,
  subtotal: true,
  discountAmount: true,
  voucherCode: true,
  shippingFee: true,
  totalAmount: true,
  items: {
    select: {
      productName: true,
      size: true,
      color: true,
      quantity: true,
      price: true,
    },
    orderBy: { id: 'asc' },
  },
} as const;

const isPositiveInt = (value: unknown): value is number =>
  typeof value === 'number' && Number.isInteger(value) && value > 0;

// WORKER: nhận job từ hàng đợi email và xử lý. Biết job "ping" (thử nghiệm), "welcome" (mail chào mừng),
// "order-confirmation" (thư "Đã nhận đơn hàng") và "payment-received" (thư "Đã nhận thanh toán").
// Chỉ được nạp khi QUEUE_WORKER_ENABLED khác 'false' (xem QueueWorkerModule).
@Processor(EMAIL_QUEUE)
export class EmailProcessor extends WorkerHost {
  private readonly logger = new Logger(EmailProcessor.name);
  private readonly throttled = new ThrottledErrorLogger(
    (message) => this.logger.error(`Lỗi kết nối Redis (worker): ${message}`),
    REDIS_ERROR_LOG_INTERVAL_MS,
  );

  constructor(
    private readonly prisma: PrismaService,
    private readonly mail: MailService,
    private readonly config: ConfigService,
  ) {
    super();
  }

  process(job: Job): Promise<object> {
    switch (job.name) {
      case EMAIL_JOB.WELCOME:
        return this.handleWelcome(job.data);
      case EMAIL_JOB.ORDER_CONFIRMATION:
        return this.handleOrderConfirmation(job.data);
      case EMAIL_JOB.PAYMENT_RECEIVED:
        return this.handlePaymentReceived(job.data);
      case EMAIL_JOB.PING:
        this.logger.log(
          `Nhận job ping id=${job.id}: hàng đợi hoạt động bình thường`,
        );
        // Giá trị trả về được BullMQ lưu vào Redis (trường returnvalue của job) để xem bằng redis-cli
        return Promise.resolve({ handledAt: new Date().toISOString() });
      default:
        // Ném lỗi thì job được đánh dấu thất bại (và thử lại theo attempts) thay vì bị bỏ qua âm thầm
        return Promise.reject(
          new Error(`Loại job không được hỗ trợ: ${job.name}`),
        );
    }
  }

  // Mail chào mừng. Kết quả job được BullMQ lưu vào Redis nên KHÔNG chứa email/tên (chỉ cờ và lý do bỏ qua).
  // - dữ liệu job sai, user không còn/bị khóa: return { skipped } (thử lại cũng không bao giờ thành công, không throw)
  // - voucher không có/không còn dùng được: vẫn gửi, chỉ bỏ khối voucher
  // - lỗi DB hoặc lỗi gửi mail: THROW để BullMQ thử lại theo cấu hình có sẵn (attempts, backoff)
  private async handleWelcome(data: unknown) {
    const userId = (data as Partial<WelcomeJobData> | null | undefined)?.userId;
    if (
      typeof userId !== 'number' ||
      !Number.isInteger(userId) ||
      userId <= 0
    ) {
      this.logger.warn('Job welcome có dữ liệu không hợp lệ, bỏ qua');
      return { skipped: 'INVALID_DATA' };
    }

    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, email: true, name: true, isActive: true },
    });
    if (!user || !user.isActive) {
      this.logger.log(
        `Bỏ qua mail chào mừng userId=${userId}: user không còn hoạt động`,
      );
      return { skipped: 'USER_GONE' };
    }

    // Voucher đọc theo mã từ DB: đúng sự thật tại thời điểm gửi (đổi hạn/tắt mã thì mail không còn khối này)
    const now = new Date();
    const voucher = await this.prisma.voucher.findUnique({
      where: { code: WELCOME_VOUCHER_CODE },
      select: {
        code: true,
        discountType: true,
        discountValue: true,
        maxDiscount: true,
        minOrderValue: true,
        expiresAt: true,
        // các trường để kiểm còn dùng được (getVoucherStatus)
        isActive: true,
        startsAt: true,
        usageLimit: true,
        usedCount: true,
      },
    });
    const usable =
      voucher !== null && getVoucherStatus(voucher, now) === 'ACTIVE';

    const mail = renderWelcome({
      name: user.name,
      email: user.email,
      shopUrl: parseFrontendUrl(this.config.get<string>('FRONTEND_URL')),
      voucher: usable
        ? {
            code: voucher.code,
            discountType: voucher.discountType,
            discountValue: voucher.discountValue,
            maxDiscount: voucher.maxDiscount,
            minOrderValue: voucher.minOrderValue,
            expiresAt: voucher.expiresAt,
          }
        : null,
      freeShippingThreshold: FREE_SHIPPING_THRESHOLD,
      heroImageUrl: HERO_IMAGE_URL,
    });

    // Lỗi gửi (MailSendError, câu cố định) được ném tiếp: job thất bại và được thử lại
    await this.mail.send({ to: user.email, ...mail });

    this.logger.log(`Đã gửi mail chào mừng userId=${userId}`);
    return { sent: true, voucherShown: usable };
  }

  // Thư "Đã nhận đơn hàng". Đọc lại đơn từ DB và dựng thư theo trạng thái LÚC GỬI. Kết quả job (lưu trong Redis) và log
  // chỉ có orderId, cờ và lý do bỏ qua: KHÔNG email, tên, địa chỉ.
  // - dữ liệu job sai, đơn không còn, không có email/dòng hàng, đơn đã hủy, đơn online đã quá hạn hoặc thiếu hạn:
  //   return { skipped } (thử lại cũng không thay đổi, không throw)
  // - lỗi DB, FRONTEND_URL sai hoặc lỗi gửi mail: THROW để BullMQ thử lại theo cấu hình có sẵn
  private async handleOrderConfirmation(data: unknown) {
    const orderId = (data as Partial<OrderMailJobData> | null | undefined)
      ?.orderId;
    if (!isPositiveInt(orderId)) {
      this.logger.warn(
        'Job order-confirmation có dữ liệu không hợp lệ, bỏ qua',
      );
      return { skipped: 'INVALID_DATA' };
    }

    const order = await this.prisma.order.findUnique({
      where: { id: orderId },
      select: orderMailSelect,
    });
    const skip = (reason: string) => {
      this.logger.log(`Bỏ qua thư xác nhận đơn orderId=${orderId}: ${reason}`);
      return { skipped: reason };
    };
    if (!order) return skip('ORDER_NOT_FOUND');
    // Email lấy từ đơn (chụp lúc đặt), không đọc lại User.email
    const to = order.customerEmail?.trim();
    if (!to) return skip('NO_EMAIL');
    if (order.items.length === 0) {
      this.logger.warn(`Đơn orderId=${orderId} không có dòng hàng`);
      return skip('NO_ITEMS');
    }
    if (order.status === OrderStatus.CANCELLED) return skip('ORDER_CANCELLED');

    let payment: OrderConfirmationPayment;
    if (order.paymentMethod === PaymentMethod.COD) {
      payment = { kind: 'COD' };
    } else if (order.paymentStatus === PaymentStatus.PAID) {
      payment = { kind: 'ONLINE_PAID' };
    } else {
      // Đơn ONLINE luôn được đặt hạn lúc tạo (orders.service.ts); null là dữ liệu hỏng
      if (!order.paymentExpiresAt) {
        this.logger.warn(`Đơn online orderId=${orderId} thiếu hạn thanh toán`);
        return skip('NO_PAYMENT_DEADLINE');
      }
      // Quá hạn mà tác vụ hết hạn chưa kịp hủy: không gửi thư mời thanh toán đơn sắp bị hủy
      if (order.paymentExpiresAt <= new Date()) return skip('PAYMENT_EXPIRED');
      payment = { kind: 'ONLINE_PENDING', expiresAt: order.paymentExpiresAt };
    }

    const mail = renderOrderConfirmation({
      code: order.code,
      createdAt: order.createdAt,
      customerName: order.customerName,
      wardName: order.wardName,
      districtName: order.districtName,
      provinceName: order.provinceName,
      items: order.items,
      subtotal: order.subtotal,
      discountAmount: order.discountAmount,
      voucherCode: order.voucherCode,
      shippingFee: order.shippingFee,
      totalAmount: order.totalAmount,
      frontendUrl: parseFrontendUrl(this.config.get<string>('FRONTEND_URL')),
      freeShippingThreshold: FREE_SHIPPING_THRESHOLD,
      payment,
    });

    // Lỗi gửi (MailSendError, câu cố định) được ném tiếp: job thất bại và được thử lại
    await this.mail.send({ to, ...mail });

    this.logger.log(`Đã gửi thư xác nhận đơn orderId=${orderId}`);
    return { sent: true, payment: payment.kind };
  }

  // Thư "Đã nhận thanh toán" (đơn ONLINE vừa được xác nhận chuyển khoản). Đọc lại đơn từ DB; kết quả job và log chỉ có
  // orderId và lý do bỏ qua, KHÔNG email, tên.
  // - dữ liệu job sai, đơn không còn, không có email/dòng hàng, không phải đơn ONLINE đã PAID, đơn đã hủy, thiếu paidAt:
  //   return { skipped } (không throw)
  // - lỗi DB, FRONTEND_URL sai hoặc lỗi gửi mail: THROW để BullMQ thử lại
  private async handlePaymentReceived(data: unknown) {
    const orderId = (data as Partial<OrderMailJobData> | null | undefined)
      ?.orderId;
    if (!isPositiveInt(orderId)) {
      this.logger.warn('Job payment-received có dữ liệu không hợp lệ, bỏ qua');
      return { skipped: 'INVALID_DATA' };
    }

    const order = await this.prisma.order.findUnique({
      where: { id: orderId },
      select: paymentMailSelect,
    });
    const skip = (reason: string) => {
      this.logger.log(
        `Bỏ qua thư đã nhận thanh toán orderId=${orderId}: ${reason}`,
      );
      return { skipped: reason };
    };
    if (!order) return skip('ORDER_NOT_FOUND');
    const to = order.customerEmail?.trim();
    if (!to) return skip('NO_EMAIL');
    if (order.items.length === 0) {
      this.logger.warn(`Đơn orderId=${orderId} không có dòng hàng`);
      return skip('NO_ITEMS');
    }
    // Thư này chỉ cho chuyển khoản: đơn COD hoàn tất cũng thành PAID nhưng không bao giờ có thư này
    if (
      order.paymentMethod !== PaymentMethod.ONLINE ||
      order.paymentStatus !== PaymentStatus.PAID
    ) {
      return skip('NOT_PAID');
    }
    // Admin đã hủy đơn đã trả (hoàn tiền ngoài hệ thống): thanh tiến độ và câu "theo dõi đơn" trong thư sẽ gây hiểu lầm
    if (order.status === OrderStatus.CANCELLED) return skip('ORDER_CANCELLED');
    // paidAt luôn được ghi khi chuyển PENDING_PAYMENT → PENDING (order-workflow.service.ts); null là dữ liệu hỏng
    if (!order.paidAt) {
      this.logger.warn(`Đơn đã thanh toán orderId=${orderId} thiếu paidAt`);
      return skip('NO_PAID_AT');
    }

    const mail = renderPaymentReceived({
      code: order.code,
      customerName: order.customerName,
      items: order.items,
      subtotal: order.subtotal,
      discountAmount: order.discountAmount,
      voucherCode: order.voucherCode,
      shippingFee: order.shippingFee,
      // Tổng tiền ĐÃ LƯU của đơn, không phải số tiền khách chuyển (thừa tiền thì Admin xử lý ngoài hệ thống)
      totalAmount: order.totalAmount,
      paidAt: order.paidAt,
      frontendUrl: parseFrontendUrl(this.config.get<string>('FRONTEND_URL')),
      freeShippingThreshold: FREE_SHIPPING_THRESHOLD,
    });

    await this.mail.send({ to, ...mail });

    this.logger.log(`Đã gửi thư đã nhận thanh toán orderId=${orderId}`);
    return { sent: true };
  }

  // Worker có kết nối Redis riêng; không có listener thì BullMQ in thẳng mọi lỗi ra console khi Redis mất
  @OnWorkerEvent('error')
  onError(error: Error) {
    this.throttled.report(error);
  }
}
