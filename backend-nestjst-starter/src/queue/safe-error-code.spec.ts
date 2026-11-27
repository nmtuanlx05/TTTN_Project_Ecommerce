import { safeErrorCode, UNKNOWN_ERROR_CODE } from './safe-error-code';

describe('safeErrorCode', () => {
  it.each([['ECONNREFUSED'], ['ETIMEDOUT'], ['NR_CLOSED'], ['P2034']])(
    'mã đúng dạng (%s) giữ nguyên',
    (code) => {
      expect(safeErrorCode({ code })).toBe(code);
    },
  );

  it.each([
    ['chữ thường', { code: 'econnrefused' }],
    ['có địa chỉ/email', { code: 'EAUTH user@example.com' }],
    ['có dấu ":"', { code: 'ERR:redis://u:p@host' }],
    ['quá dài', { code: `E${'X'.repeat(31)}` }],
    ['một ký tự', { code: 'E' }],
    ['số', { code: 500 }],
    ['không có code', new Error('redis://u:p@host down')],
    ['null', null],
    ['undefined', undefined],
    ['chuỗi', 'ECONNREFUSED'],
  ])('không đúng dạng (%s) => giá trị mặc định', (_label, error) => {
    expect(safeErrorCode(error)).toBe(UNKNOWN_ERROR_CODE);
  });

  it('giá trị mặc định là "UNKNOWN"', () => {
    expect(UNKNOWN_ERROR_CODE).toBe('UNKNOWN');
  });
});
