import { createHash, timingSafeEqual } from 'crypto';
import { badRequest } from '../common/errors/coded-errors';
import { PAYMENT_ERROR } from './payments.constants';

// Adapter SePay (https://docs.sepay.vn/tich-hop-webhooks.html): chuyển payload của nhà cung cấp về dạng chung.
// Lõi (PaymentsService.confirmBankTransfer) không biết gì về SePay, nên thêm Casso/payOS chỉ cần thêm một adapter.
// Trường dùng: id, transferType ("in" tiền vào), transferAmount, content. Các trường khác lưu nguyên ở rawData.

export interface NormalizedTransfer {
  providerTxnId: string;
  amount: number;
  content: string;
  rawPayload: Record<string, unknown>;
}

export type ParsedSepayWebhook =
  | { kind: 'incoming'; transfer: NormalizedTransfer }
  | { kind: 'ignored' };

const invalid = (message: string) =>
  badRequest(PAYMENT_ERROR.WEBHOOK_PAYLOAD_INVALID, message);

export function parseSepayWebhook(body: unknown): ParsedSepayWebhook {
  if (body === null || typeof body !== 'object' || Array.isArray(body)) {
    throw invalid('Payload webhook không hợp lệ');
  }
  const raw = body as Record<string, unknown>;

  // Chỉ xử lý tiền VÀO; tiền ra (và giá trị lạ) bỏ qua, vẫn trả thành công để SePay không gửi lại
  if (raw.transferType !== 'in') return { kind: 'ignored' };

  const id = raw.id;
  if (
    !(typeof id === 'number' && Number.isSafeInteger(id) && id > 0) &&
    !(typeof id === 'string' && /^\d{1,30}$/.test(id))
  ) {
    throw invalid('Thiếu hoặc sai mã giao dịch (id)');
  }
  const amount = raw.transferAmount;
  if (
    typeof amount !== 'number' ||
    !Number.isSafeInteger(amount) ||
    amount <= 0
  ) {
    throw invalid('Thiếu hoặc sai số tiền (transferAmount)');
  }
  const content = typeof raw.content === 'string' ? raw.content : '';

  return {
    kind: 'incoming',
    transfer: {
      providerTxnId: String(id),
      amount,
      content,
      rawPayload: raw,
    },
  };
}

// Header dạng "Apikey <khóa>". So sánh hằng thời gian trên hash SHA-256 (cùng độ dài, không lộ độ dài khóa).
export function isValidApiKeyHeader(
  header: string | undefined,
  expectedKey: string,
): boolean {
  if (!header) return false;
  const match = /^Apikey\s+(.+)$/i.exec(header.trim());
  if (!match) return false;
  const digest = (value: string) => createHash('sha256').update(value).digest();
  return timingSafeEqual(digest(match[1]), digest(expectedKey));
}
