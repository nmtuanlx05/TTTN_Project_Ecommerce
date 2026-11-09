import { isValidApiKeyHeader, parseSepayWebhook } from './sepay.adapter';

const payload = {
  id: 92704,
  gateway: 'Vietcombank',
  transactionDate: '2026-11-09 11:08:33',
  accountNumber: '0123456789',
  code: null,
  content: 'MS261105PKGA',
  transferType: 'in',
  transferAmount: 350000,
  accumulated: 19077000,
  subAccount: null,
  referenceCode: 'FT24012345678',
  description: '',
};

describe('parseSepayWebhook', () => {
  it('tiền vào → giao dịch chuẩn hóa, id thành chuỗi, giữ payload gốc', () => {
    const parsed = parseSepayWebhook(payload);
    expect(parsed).toEqual({
      kind: 'incoming',
      transfer: {
        providerTxnId: '92704',
        amount: 350000,
        content: 'MS261105PKGA',
        rawPayload: payload,
      },
    });
  });

  it('id dạng chuỗi số cũng được nhận', () => {
    const parsed = parseSepayWebhook({ ...payload, id: '555' });
    expect(parsed.kind === 'incoming' && parsed.transfer.providerTxnId).toBe(
      '555',
    );
  });

  it('tiền ra (out) và giá trị lạ bị bỏ qua', () => {
    expect(parseSepayWebhook({ ...payload, transferType: 'out' })).toEqual({
      kind: 'ignored',
    });
    expect(parseSepayWebhook({ ...payload, transferType: 'x' })).toEqual({
      kind: 'ignored',
    });
    expect(parseSepayWebhook({ content: 'MS261105PKGA' })).toEqual({
      kind: 'ignored',
    });
  });

  it('thiếu content → nội dung rỗng (sẽ thành giao dịch không khớp)', () => {
    const rest: Record<string, unknown> = { ...payload };
    delete rest.content;
    const parsed = parseSepayWebhook(rest);
    expect(parsed.kind === 'incoming' && parsed.transfer.content).toBe('');
  });

  it.each([
    [{ ...payload, id: undefined }],
    [{ ...payload, id: 0 }],
    [{ ...payload, id: 'abc' }],
    [{ ...payload, transferAmount: 0 }],
    [{ ...payload, transferAmount: -1 }],
    [{ ...payload, transferAmount: 1.5 }],
    [{ ...payload, transferAmount: '350000' }],
    [null],
    ['text'],
    [[]],
  ])('payload sai %j → 400 WEBHOOK_PAYLOAD_INVALID', (body) => {
    expect(() => parseSepayWebhook(body)).toThrow();
  });
});

describe('isValidApiKeyHeader', () => {
  it('đúng khóa', () => {
    expect(isValidApiKeyHeader('Apikey secret-key', 'secret-key')).toBe(true);
    expect(isValidApiKeyHeader('apikey  secret-key ', 'secret-key')).toBe(true);
  });

  it.each([
    [undefined],
    [''],
    ['secret-key'],
    ['Bearer secret-key'],
    ['Apikey wrong'],
    ['Apikey '],
    ['Apikey secret-key-extra'],
  ])('%s → từ chối', (header) => {
    expect(isValidApiKeyHeader(header, 'secret-key')).toBe(false);
  });
});
