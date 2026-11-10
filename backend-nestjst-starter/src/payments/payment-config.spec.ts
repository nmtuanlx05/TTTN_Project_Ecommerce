import { readPaymentConfig } from './payment-config';

const make = (env: Record<string, string | undefined>) =>
  readPaymentConfig((key) => env[key]);

const VALID = {
  VIETQR_BANK_BIN: '970422',
  VIETQR_ACCOUNT_NO: '0123456789',
  VIETQR_ACCOUNT_NAME: 'CUA HANG TEST',
};

describe('readPaymentConfig', () => {
  it('đủ biến → BẬT, hạn mặc định 30 phút, tên ngân hàng tra từ BIN (MB)', () => {
    const { online, sepayApiKey } = make(VALID);
    expect(online).toMatchObject({
      enabled: true,
      bankCode: 'MB',
      expireMinutes: 30,
    });
    expect(sepayApiKey).toBeUndefined();
  });

  it('VIETQR_BANK_NAME ghi đè tên; BIN lạ dùng tên dự phòng', () => {
    const named = make({ ...VALID, VIETQR_BANK_NAME: 'Ngân hàng X' }).online;
    expect(named.enabled && named.bankName).toBe('Ngân hàng X');
    const unknown = make({ ...VALID, VIETQR_BANK_BIN: '999999' }).online;
    expect(unknown.enabled && unknown.bankName).toContain('999999');
  });

  it('thiếu biến → TẮT, lý do chỉ nêu TÊN biến thiếu', () => {
    const { online } = make({ VIETQR_BANK_BIN: '970422' });
    expect(online.enabled).toBe(false);
    expect(!online.enabled && online.reason).toContain('VIETQR_ACCOUNT_NO');
    expect(!online.enabled && online.reason).toContain('VIETQR_ACCOUNT_NAME');
    expect(!online.enabled && online.reason).not.toContain('970422');
  });

  it('chuỗi rỗng/khoảng trắng coi là thiếu', () => {
    expect(make({ ...VALID, VIETQR_ACCOUNT_NO: '   ' }).online.enabled).toBe(
      false,
    );
  });

  it.each([
    [{ VIETQR_BANK_BIN: '97042' }],
    [{ VIETQR_BANK_BIN: 'abcdef' }],
    [{ VIETQR_ACCOUNT_NO: '12ab' }],
    [{ PAYMENT_EXPIRE_MINUTES: '0' }],
    [{ PAYMENT_EXPIRE_MINUTES: '-5' }],
    [{ PAYMENT_EXPIRE_MINUTES: '1.5' }],
    [{ PAYMENT_EXPIRE_MINUTES: 'abc' }],
    [{ PAYMENT_EXPIRE_MINUTES: '99999' }],
  ])('sai định dạng %j → TẮT, không throw, không lộ giá trị', (override) => {
    const { online } = make({ ...VALID, ...override });
    expect(online.enabled).toBe(false);
    const reason = !online.enabled ? online.reason : '';
    // Giá trị ngắn (vd "0") có thể trùng ngẫu nhiên với chữ trong thông báo nên chỉ kiểm giá trị đủ dài
    for (const value of Object.values(override).filter((v) => v.length >= 5)) {
      expect(reason).not.toContain(value);
    }
    expect(reason).not.toContain('0123456789');
  });

  it('PAYMENT_EXPIRE_MINUTES hợp lệ được dùng', () => {
    const { online } = make({ ...VALID, PAYMENT_EXPIRE_MINUTES: '45' });
    expect(online.enabled && online.expireMinutes).toBe(45);
  });

  it('khóa webhook độc lập với cấu hình ONLINE', () => {
    expect(make({ SEPAY_WEBHOOK_API_KEY: ' k ' }).sepayApiKey).toBe('k');
    expect(make({ SEPAY_WEBHOOK_API_KEY: ' k ' }).online.enabled).toBe(false);
  });
});
