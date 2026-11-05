import { HttpException } from '@nestjs/common';
import { parseVnDate } from './vn-date';

function errorOf(fn: () => unknown) {
  try {
    fn();
  } catch (error) {
    const ex = error as HttpException;
    return {
      status: ex.getStatus(),
      ...(ex.getResponse() as Record<string, unknown>),
    };
  }
  throw new Error('Kỳ vọng ném lỗi');
}

describe('parseVnDate', () => {
  it('đầu ngày GMT+7 là 17:00 UTC của ngày hôm trước', () => {
    expect(parseVnDate('2026-11-05', false, 'from').toISOString()).toBe(
      '2026-11-04T17:00:00.000Z',
    );
  });

  it('cuối ngày GMT+7 là 16:59:59.999 UTC của chính ngày đó', () => {
    expect(parseVnDate('2026-11-05', true, 'to').toISOString()).toBe(
      '2026-11-05T16:59:59.999Z',
    );
  });

  it('chấp nhận 29/02 năm nhuận, từ chối năm thường', () => {
    expect(parseVnDate('2028-02-29', false, 'from').toISOString()).toBe(
      '2028-02-28T17:00:00.000Z',
    );
    expect(
      errorOf(() => parseVnDate('2026-02-29', false, 'from')),
    ).toMatchObject({ status: 400, code: 'INVALID_DATE' });
  });

  it('ngày không có thật → 400 INVALID_DATE, thông báo nêu đúng tên trường', () => {
    expect(
      errorOf(() => parseVnDate('2026-02-31', false, 'from')),
    ).toMatchObject({
      status: 400,
      code: 'INVALID_DATE',
      message: 'from không phải ngày hợp lệ',
    });
    expect(errorOf(() => parseVnDate('2026-13-01', true, 'to'))).toMatchObject({
      status: 400,
      code: 'INVALID_DATE',
      message: 'to không phải ngày hợp lệ',
    });
  });
});
