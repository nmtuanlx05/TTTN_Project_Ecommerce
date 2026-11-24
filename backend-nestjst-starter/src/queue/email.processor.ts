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
import { renderWelcome } from '../mail/templates/welcome.template';
import { FREE_SHIPPING_THRESHOLD } from '../orders/orders.constants';
import { getVoucherStatus } from '../orders/vouchers.rules';
import { PrismaService } from '../prisma/prisma.service';
import {
  EMAIL_JOB,
  EMAIL_QUEUE,
  REDIS_ERROR_LOG_INTERVAL_MS,
  type WelcomeJobData,
} from './queue.constants';
import { ThrottledErrorLogger } from './throttled-error-logger';

// WORKER: nhận job từ hàng đợi email và xử lý. Biết job "ping" (thử nghiệm) và "welcome" (mail chào mừng).
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

  // Worker có kết nối Redis riêng; không có listener thì BullMQ in thẳng mọi lỗi ra console khi Redis mất
  @OnWorkerEvent('error')
  onError(error: Error) {
    this.throttled.report(error);
  }
}
