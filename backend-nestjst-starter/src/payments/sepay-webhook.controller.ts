import {
  Body,
  Controller,
  Headers,
  HttpCode,
  Logger,
  NotFoundException,
  Post,
  UnauthorizedException,
} from '@nestjs/common';
import { Public } from '../auth/decorators/public.decorator';
import { PaymentConfigService } from './payment-config.service';
import { PaymentsService } from './payments.service';
import { isValidApiKeyHeader, parseSepayWebhook } from './sepay.adapter';

// Webhook SePay: công khai (không JWT) nhưng xác thực bằng khóa API. Không có rate limit theo IP ở app này,
// nên các lần SePay gửi lại không bị chặn. Không log khóa, số tài khoản hay nội dung payload.
@Controller('payments/webhook')
export class SepayWebhookController {
  private readonly logger = new Logger(SepayWebhookController.name);

  constructor(
    private readonly paymentConfig: PaymentConfigService,
    private readonly payments: PaymentsService,
  ) {}

  @Public()
  @Post('sepay')
  @HttpCode(200)
  async receive(
    @Headers('authorization') authorization: string | undefined,
    @Body() body: unknown,
  ) {
    const expectedKey = this.paymentConfig.sepayApiKey;
    // Chưa cấu hình khóa: tắt hẳn, như thể route không tồn tại
    if (!expectedKey) throw new NotFoundException();
    if (!isValidApiKeyHeader(authorization, expectedKey)) {
      throw new UnauthorizedException('Khóa xác thực không hợp lệ');
    }

    const parsed = parseSepayWebhook(body);
    if (parsed.kind === 'ignored') return { processed: false };

    const { transfer } = parsed;
    const result = await this.payments.confirmBankTransfer({
      source: 'SEPAY',
      providerTxnId: transfer.providerTxnId,
      amount: transfer.amount,
      content: transfer.content,
      rawPayload: transfer.rawPayload,
    });
    this.logger.log(
      `Webhook SePay giao dịch ${transfer.providerTxnId}: ${result.result}`,
    );
    // Phần bọc { success: true, data } do ResponseInterceptor thêm; SePay chỉ cần success: true
    return { processed: true, result: result.result };
  }
}
