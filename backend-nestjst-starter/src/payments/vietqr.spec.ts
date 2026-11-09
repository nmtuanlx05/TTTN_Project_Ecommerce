import {
  buildTransferContent,
  buildVietQrPayload,
  crc16,
  extractOrderCode,
  normalizeContent,
} from './vietqr';

describe('crc16 (CCITT-FALSE)', () => {
  it('vector chuẩn "123456789" → 0x29B1', () => {
    expect(crc16('123456789')).toBe(0x29b1);
  });

  it('chuỗi rỗng → giá trị khởi tạo 0xFFFF', () => {
    expect(crc16('')).toBe(0xffff);
  });
});

// Payload mẫu được tính ĐỘC LẬP bằng một đoạn Python viết riêng (không dùng code của dự án) rồi dán vào đây.
// Việc app ngân hàng thật quét được chuỗi này CHƯA được kiểm chứng tự động: cần quét thử bằng tay.
const GOLDEN =
  '00020101021238540010A00000072701240006970422011001234567890208QRIBFTTA530370454063500005802VN62160812MS261105PKGA6304F85E';

describe('buildVietQrPayload', () => {
  const input = {
    bankBin: '970422',
    accountNo: '0123456789',
    amount: 350_000,
    content: 'MS261105PKGA',
  };

  it('khớp payload mẫu (có số tiền, nội dung, CRC)', () => {
    expect(buildVietQrPayload(input)).toBe(GOLDEN);
  });

  it('CRC cuối chuỗi tự kiểm lại đúng với mọi số tiền', () => {
    for (const amount of [1, 2_000, 99_999, 350_000, 12_345_678]) {
      const payload = buildVietQrPayload({ ...input, amount });
      const body = payload.slice(0, -4);
      expect(body.endsWith('6304')).toBe(true);
      expect(payload.slice(-4)).toBe(
        crc16(body).toString(16).toUpperCase().padStart(4, '0'),
      );
    }
  });

  it('QR động (01=12), VND (704), quốc gia VN, có số tiền và nội dung', () => {
    expect(GOLDEN).toContain('010212');
    expect(buildVietQrPayload(input)).toContain('5303704');
    expect(buildVietQrPayload(input)).toContain('540635000');
    expect(buildVietQrPayload(input)).toContain('5802VN');
    expect(buildVietQrPayload(input)).toContain('0812MS261105PKGA');
  });

  it('số tiền không hợp lệ → ném lỗi (không dựng QR 0 đồng)', () => {
    for (const amount of [0, -5, 1.5, NaN]) {
      expect(() => buildVietQrPayload({ ...input, amount })).toThrow();
    }
  });
});

describe('nội dung chuyển khoản', () => {
  it('mã đơn bỏ ký tự đặc biệt: MS-261105-PKGA → MS261105PKGA (12 ký tự)', () => {
    expect(buildTransferContent('MS-261105-PKGA')).toBe('MS261105PKGA');
    expect(buildTransferContent('MS-261105-PKGA')).toHaveLength(12);
  });

  it('normalizeContent: hoa, bỏ dấu cách/gạch/ký tự lạ và dấu tiếng Việt', () => {
    expect(normalizeContent('ms-261105 pkga!')).toBe('MS261105PKGA');
    expect(normalizeContent('Thanh toán đơn')).toBe('THANHTOANON');
  });
});

describe('extractOrderCode', () => {
  it.each([
    ['MS261105PKGA', 'MS-261105-PKGA'],
    ['ms261105pkga', 'MS-261105-PKGA'],
    ['MS-261105-PKGA', 'MS-261105-PKGA'],
    ['MS 261105 PKGA', 'MS-261105-PKGA'],
    ['NGUYEN VAN A chuyen tien MS261105PKGA FT24123456789', 'MS-261105-PKGA'],
    ['MBVCB.123456.MS261105PKGA.CT tu 0123', 'MS-261105-PKGA'],
  ])('%s → %s', (content, expected) => {
    expect(extractOrderCode(content)).toBe(expected);
  });

  it('cùng một mã xuất hiện hai lần vẫn là một mã', () => {
    expect(extractOrderCode('MS261105PKGA MS261105PKGA')).toBe(
      'MS-261105-PKGA',
    );
  });

  it('hai mã khác nhau → null (mơ hồ, coi là không khớp)', () => {
    expect(extractOrderCode('MS261105PKGA MS261106ABCD')).toBeNull();
  });

  it.each([
    [''],
    ['chuyen tien mua ao'],
    ['MS261105PKG'], // thiếu ký tự
    ['MS261105PKIA'], // I không thuộc bảng ký tự mã đơn
    ['MSXX1105PKGA'], // phần ngày không phải số
  ])('"%s" → null', (content) => {
    expect(extractOrderCode(content)).toBeNull();
  });
});
