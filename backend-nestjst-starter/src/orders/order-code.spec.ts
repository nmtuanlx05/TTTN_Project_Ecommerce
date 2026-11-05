import { generateOrderCode, vnDateStamp } from './order-code';
import { ORDER_CODE_ALPHABET } from './orders.constants';

describe('mã đơn MS-YYMMDD-XXXX', () => {
  it('đúng định dạng và chỉ dùng ký tự không nhầm lẫn', () => {
    const code = generateOrderCode(new Date('2026-11-05T03:00:00Z'));
    expect(code).toMatch(/^MS-261105-[A-HJ-NP-Z2-9]{4}$/);
    expect(ORDER_CODE_ALPHABET).not.toMatch(/[01IO]/);
    expect(ORDER_CODE_ALPHABET).toHaveLength(32);
  });

  it('17:30 UTC đã là 00:30 hôm sau theo GMT+7', () => {
    expect(vnDateStamp(new Date('2026-11-05T17:30:00Z'))).toBe('261106');
    expect(generateOrderCode(new Date('2026-11-05T17:30:00Z'))).toMatch(
      /^MS-261106-/,
    );
  });

  it('16:59 UTC vẫn còn trong ngày; 17:00 UTC sang ngày mới', () => {
    expect(vnDateStamp(new Date('2026-11-05T16:59:59.999Z'))).toBe('261105');
    expect(vnDateStamp(new Date('2026-11-05T17:00:00.000Z'))).toBe('261106');
  });

  it('qua ranh giới tháng và năm', () => {
    expect(vnDateStamp(new Date('2026-12-31T17:00:00Z'))).toBe('270101');
    expect(vnDateStamp(new Date('2026-11-30T20:00:00Z'))).toBe('261201');
  });

  it('không phụ thuộc múi giờ máy chủ', () => {
    const original = process.env.TZ;
    try {
      for (const tz of ['UTC', 'Asia/Ho_Chi_Minh', 'America/Los_Angeles']) {
        process.env.TZ = tz;
        expect(vnDateStamp(new Date('2026-11-05T17:30:00Z'))).toBe('261106');
      }
    } finally {
      if (original === undefined) delete process.env.TZ;
      else process.env.TZ = original;
    }
  });

  it('dùng hàm ngẫu nhiên được truyền vào', () => {
    const code = generateOrderCode(new Date('2026-11-05T03:00:00Z'), () => 0);
    expect(code).toBe('MS-261105-AAAA');
  });
});
