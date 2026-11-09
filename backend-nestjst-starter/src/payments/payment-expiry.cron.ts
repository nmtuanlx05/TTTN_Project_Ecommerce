import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PaymentExpiryService } from './payment-expiry.service';

// Chỉ nạp qua PaymentsSchedulerModule (AppModule). Test/e2e dựng module riêng nên không bao giờ chạy tác vụ thật.
@Injectable()
export class PaymentExpiryCron {
  private readonly logger = new Logger(PaymentExpiryCron.name);
  private running = false;

  constructor(private readonly expiry: PaymentExpiryService) {}

  @Cron(CronExpression.EVERY_MINUTE)
  async run() {
    // Chống chồng lượt trong cùng một tiến trình
    if (this.running) return;
    this.running = true;
    try {
      await this.expiry.expireOverdueOrders();
    } catch (error) {
      this.logger.error(
        `Tác vụ hết hạn thanh toán lỗi: ${error instanceof Error ? error.message : 'lỗi không xác định'}`,
      );
    } finally {
      this.running = false;
    }
  }
}
