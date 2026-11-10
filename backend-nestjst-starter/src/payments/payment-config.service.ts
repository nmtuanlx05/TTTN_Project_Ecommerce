import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { findBank } from './banks';
import { readPaymentConfig } from './payment-config';
import type { PaymentConfig } from './payment-config';

// Cấu hình thanh toán đọc một lần khi khởi động. Log chỉ nêu TÊN biến thiếu/sai, không in khóa hay số tài khoản.
@Injectable()
export class PaymentConfigService implements OnModuleInit {
  private readonly logger = new Logger(PaymentConfigService.name);
  readonly config: PaymentConfig;

  constructor(configService: ConfigService) {
    this.config = readPaymentConfig((key) => configService.get<string>(key));
  }

  get online() {
    return this.config.online;
  }

  get sepayApiKey() {
    return this.config.sepayApiKey;
  }

  onModuleInit() {
    const { online } = this.config;
    if (online.enabled) {
      this.logger.log(
        `Thanh toán chuyển khoản VietQR: BẬT (hết hạn sau ${online.expireMinutes} phút)`,
      );
      if (!findBank(online.bankBin)?.verified) {
        this.logger.warn(
          'BIN ngân hàng chưa có trong danh sách đã kiểm chứng: hãy tự quét thử QR bằng app ngân hàng trước khi mở cho khách',
        );
      }
    } else {
      this.logger.warn(`Thanh toán chuyển khoản VietQR: TẮT. ${online.reason}`);
    }
    this.logger.log(
      `Webhook SePay: ${this.config.sepayApiKey ? 'BẬT' : 'TẮT (chưa đặt SEPAY_WEBHOOK_API_KEY)'}`,
    );
  }
}
