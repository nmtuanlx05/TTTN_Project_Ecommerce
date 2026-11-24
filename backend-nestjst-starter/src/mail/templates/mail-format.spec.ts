import { formatVnd, formatVnDate } from './mail-format';

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
