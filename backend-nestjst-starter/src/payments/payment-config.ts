import {
  DEFAULT_PAYMENT_EXPIRE_MINUTES,
  MAX_PAYMENT_EXPIRE_MINUTES,
} from './payments.constants';
import { findBank } from './banks';

export interface OnlinePaymentConfig {
  enabled: true;
  bankBin: string;
  bankCode: string;
  bankName: string;
  accountNo: string;
  accountName: string;
  expireMinutes: number;
}

export interface OnlinePaymentDisabled {
  enabled: false;
  // Chỉ chứa TÊN biến, không bao giờ chứa giá trị
  reason: string;
}

export interface PaymentConfig {
  online: OnlinePaymentConfig | OnlinePaymentDisabled;
  // Khóa webhook SePay; undefined = webhook tắt
  sepayApiKey?: string;
}

const clean = (value: string | undefined) => value?.trim() || undefined;

// Đọc cấu hình từ biến môi trường. Thiếu/sai thì tắt ONLINE kèm lý do (không throw, không làm sập app).
export function readPaymentConfig(
  get: (key: string) => string | undefined,
): PaymentConfig {
  const sepayApiKey = clean(get('SEPAY_WEBHOOK_API_KEY'));
  const bankBin = clean(get('VIETQR_BANK_BIN'));
  const accountNo = clean(get('VIETQR_ACCOUNT_NO'));
  const accountName = clean(get('VIETQR_ACCOUNT_NAME'));
  const rawExpire = clean(get('PAYMENT_EXPIRE_MINUTES'));

  const missing = [
    ['VIETQR_BANK_BIN', bankBin],
    ['VIETQR_ACCOUNT_NO', accountNo],
    ['VIETQR_ACCOUNT_NAME', accountName],
  ]
    .filter(([, value]) => !value)
    .map(([name]) => name);
  if (missing.length > 0) {
    return {
      online: {
        enabled: false,
        reason: `Thiếu biến môi trường: ${missing.join(', ')}`,
      },
      sepayApiKey,
    };
  }

  const invalid: string[] = [];
  if (!/^\d{6}$/.test(bankBin!)) invalid.push('VIETQR_BANK_BIN (6 chữ số)');
  if (!/^\d{6,19}$/.test(accountNo!)) {
    invalid.push('VIETQR_ACCOUNT_NO (6-19 chữ số)');
  }
  let expireMinutes = DEFAULT_PAYMENT_EXPIRE_MINUTES;
  if (rawExpire !== undefined) {
    const parsed = Number(rawExpire);
    if (
      !/^\d+$/.test(rawExpire) ||
      parsed < 1 ||
      parsed > MAX_PAYMENT_EXPIRE_MINUTES
    ) {
      invalid.push(`PAYMENT_EXPIRE_MINUTES (1-${MAX_PAYMENT_EXPIRE_MINUTES})`);
    } else {
      expireMinutes = parsed;
    }
  }
  if (invalid.length > 0) {
    return {
      online: {
        enabled: false,
        reason: `Biến môi trường sai định dạng: ${invalid.join(', ')}`,
      },
      sepayApiKey,
    };
  }

  const bank = findBank(bankBin!);
  return {
    online: {
      enabled: true,
      bankBin: bankBin!,
      bankCode: bank?.code ?? bankBin!,
      bankName:
        clean(get('VIETQR_BANK_NAME')) ?? bank?.name ?? `Ngân hàng ${bankBin}`,
      accountNo: accountNo!,
      accountName: accountName!,
      expireMinutes,
    },
    sepayApiKey,
  };
}
