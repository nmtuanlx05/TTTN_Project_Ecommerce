import { formatVnd, formatVnDate, formatVnDateTime } from './mail-format';

describe('formatVnd', () => {
  it.each([
    [0, '0₫'],
    [999, '999₫'],
    [1000, '1.000₫'],
    [50000, '50.000₫'],
    [500000, '500.000₫'],
    [1234567, '1.234.567₫'],
  ])('%d => %s', (amount, expected) => {
    expect(formatVnd(amount)).toBe(expected);
  });

  it('làm tròn số lẻ', () => {
    expect(formatVnd(1999.6)).toBe('2.000₫');
  });
});

describe('formatVnDate (giờ Việt Nam)', () => {
  it('23:59:59 giờ VN vẫn là ngày đó (16:59:59Z)', () => {
    expect(formatVnDate(new Date('2027-06-30T23:59:59+07:00'))).toBe(
      '30/06/2027',
    );
  });

  it('00:00:00 giờ VN là ngày mới (17:00:00Z hôm trước)', () => {
    expect(formatVnDate(new Date('2027-07-01T00:00:00+07:00'))).toBe(
      '01/07/2027',
    );
  });

  it('khác ngày UTC: 20:00Z ngày 31/12 đã là 01/01 năm sau giờ VN', () => {
    expect(formatVnDate(new Date('2026-12-31T20:00:00Z'))).toBe('01/01/2027');
  });

  it('đệm số 0 cho ngày/tháng', () => {
    expect(formatVnDate(new Date('2027-03-05T12:00:00+07:00'))).toBe(
      '05/03/2027',
    );
  });
});

describe('formatVnDateTime (giờ Việt Nam, dd/MM/yyyy HH:mm)', () => {
  it('16:59Z là 23:59 cùng ngày giờ VN', () => {
    expect(formatVnDateTime(new Date('2026-11-26T16:59:00Z'))).toBe(
      '26/11/2026 23:59',
    );
  });

  it('17:00Z là 00:00 ngày hôm sau giờ VN', () => {
    expect(formatVnDateTime(new Date('2026-11-26T17:00:00Z'))).toBe(
      '27/11/2026 00:00',
    );
  });

  it('17:00Z ngày 31/12 là 00:00 ngày 01/01 năm sau giờ VN', () => {
    expect(formatVnDateTime(new Date('2026-12-31T17:00:00Z'))).toBe(
      '01/01/2027 00:00',
    );
  });

  it('đệm số 0 cho giờ và phút', () => {
    expect(formatVnDateTime(new Date('2027-03-05T08:05:00+07:00'))).toBe(
      '05/03/2027 08:05',
    );
  });

  it('bỏ giây (không làm tròn lên phút sau)', () => {
    expect(formatVnDateTime(new Date('2026-11-27T14:30:59+07:00'))).toBe(
      '27/11/2026 14:30',
    );
  });
});
