import { HttpException } from '@nestjs/common';
import { addDaysYmd, buildDashboardRange, toSqlUtc } from './dashboard.range';

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

describe('buildDashboardRange', () => {
  it('7 ngày: ranh giới UTC [gte, lt) theo GMT+7 và kỳ trước liền kề, dài bằng nhau', () => {
    const r = buildDashboardRange('2026-10-30', '2026-11-05');
    expect(r.days).toBe(7);
    expect(r.current.gte.toISOString()).toBe('2026-10-29T17:00:00.000Z');
    expect(r.current.lt.toISOString()).toBe('2026-11-05T17:00:00.000Z');
    expect([r.previousFrom, r.previousTo]).toEqual([
      '2026-10-23',
      '2026-10-29',
    ]);
    expect(r.previous.gte.toISOString()).toBe('2026-10-22T17:00:00.000Z');
    // Kỳ trước kết thúc đúng lúc kỳ này bắt đầu: không hở, không chồng
    expect(r.previous.lt.getTime()).toBe(r.current.gte.getTime());
    expect(r.all).toEqual({ gte: r.previous.gte, lt: r.current.lt });
  });

  it('danh sách ngày đủ và liên tục cho cả hai kỳ', () => {
    const r = buildDashboardRange('2026-10-30', '2026-11-05');
    expect(r.dates).toEqual([
      '2026-10-30',
      '2026-10-31',
      '2026-11-01',
      '2026-11-02',
      '2026-11-03',
      '2026-11-04',
      '2026-11-05',
    ]);
    expect(r.previousDates).toHaveLength(7);
    expect(r.previousDates[0]).toBe('2026-10-23');
    expect(r.previousDates[6]).toBe('2026-10-29');
  });

  it('một ngày duy nhất: kỳ trước là hôm trước, qua ranh giới tháng/năm nhuận', () => {
    const r = buildDashboardRange('2028-03-01', '2028-03-01');
    expect(r.days).toBe(1);
    expect(r.dates).toEqual(['2028-03-01']);
    expect(r.previousDates).toEqual(['2028-02-29']);
    expect(r.current.lt.getTime() - r.current.gte.getTime()).toBe(
      24 * 60 * 60 * 1000,
    );
  });

  it('đơn lúc 16:59:59.999Z (23:59 GMT+7) thuộc ngày đó, 17:00:00.000Z thuộc ngày kế tiếp', () => {
    const r = buildDashboardRange('2026-11-05', '2026-11-05');
    const inside = new Date('2026-11-05T16:59:59.999Z').getTime();
    const outside = new Date('2026-11-05T17:00:00.000Z').getTime();
    expect(
      inside >= r.current.gte.getTime() && inside < r.current.lt.getTime(),
    ).toBe(true);
    expect(outside < r.current.lt.getTime()).toBe(false);
  });

  it('đúng 366 ngày thì được, 367 ngày → 400 DATE_RANGE_TOO_LONG', () => {
    expect(buildDashboardRange('2026-01-01', '2027-01-01').days).toBe(366);
    expect(
      errorOf(() => buildDashboardRange('2026-01-01', '2027-01-02')),
    ).toMatchObject({ status: 400, code: 'DATE_RANGE_TOO_LONG' });
  });

  it('from sau to → 400 INVALID_DATE_RANGE', () => {
    expect(
      errorOf(() => buildDashboardRange('2026-11-06', '2026-11-05')),
    ).toMatchObject({ status: 400, code: 'INVALID_DATE_RANGE' });
  });

  it('ngày không có thật hoặc trước năm 2000 → 400 INVALID_DATE', () => {
    expect(
      errorOf(() => buildDashboardRange('2026-02-31', '2026-03-05')),
    ).toMatchObject({ status: 400, code: 'INVALID_DATE' });
    expect(
      errorOf(() => buildDashboardRange('2026-03-01', '2026-02-30')),
    ).toMatchObject({ status: 400, code: 'INVALID_DATE' });
    expect(
      errorOf(() => buildDashboardRange('1999-12-31', '2000-01-02')),
    ).toMatchObject({ status: 400, code: 'INVALID_DATE' });
  });
});

describe('addDaysYmd / toSqlUtc', () => {
  it('cộng trừ ngày qua tháng và năm', () => {
    expect(addDaysYmd('2026-03-01', -1)).toBe('2026-02-28');
    expect(addDaysYmd('2026-12-31', 1)).toBe('2027-01-01');
  });

  it('toSqlUtc cho chuỗi UTC có mili giây, không có T và Z', () => {
    expect(toSqlUtc(new Date('2026-11-04T17:00:00.000Z'))).toBe(
      '2026-11-04 17:00:00.000',
    );
  });
});
