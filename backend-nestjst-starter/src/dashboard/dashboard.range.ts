import { badRequest } from '../common/errors/coded-errors';
import { parseVnDate } from '../common/utils/vn-date';
import {
  DASHBOARD_ERROR,
  MAX_RANGE_DAYS,
  MIN_DATE,
} from './dashboard.constants';

const DAY_MS = 24 * 60 * 60 * 1000;

// Nửa mở [gte, lt) theo UTC: nguồn sự thật DUY NHẤT cho ranh giới thời gian của dashboard.
// Mọi truy vấn (SQL thô lẫn Prisma) đều lọc bằng đúng hai mốc này, không tự tính lại.
export interface UtcBounds {
  gte: Date;
  lt: Date;
}

export interface DashboardRange {
  from: string;
  to: string;
  days: number;
  previousFrom: string;
  previousTo: string;
  current: UtcBounds;
  previous: UtcBounds;
  // Phủ cả kỳ trước lẫn kỳ này, để các truy vấn theo ngày chỉ quét một lần rồi tách bằng JS
  all: UtcBounds;
  // Danh sách ngày GMT+7 (YYYY-MM-DD) của từng kỳ, theo thứ tự tăng dần, đủ mọi ngày
  dates: string[];
  previousDates: string[];
}

// Cộng/trừ ngày trên chuỗi YYYY-MM-DD (số học UTC thuần, không phụ thuộc múi giờ máy chủ)
export function addDaysYmd(ymd: string, days: number): string {
  const [y, m, d] = ymd.split('-').map(Number);
  const ms = Date.UTC(y, m - 1, d) + days * DAY_MS;
  return new Date(ms).toISOString().slice(0, 10);
}

function listDates(start: string, count: number): string[] {
  return Array.from({ length: count }, (_, i) => addDaysYmd(start, i));
}

// 'YYYY-MM-DD HH:mm:ss.SSS' theo UTC để so với cột DATETIME(3) (lưu UTC), không phụ thuộc múi giờ kết nối
export function toSqlUtc(date: Date): string {
  return date.toISOString().slice(0, 23).replace('T', ' ');
}

// Mốc đầu ngày GMT+7 của ngày sau `ymd` (đầu ngày kế tiếp = cận trên loại trừ của ngày `ymd`)
function startOfNextVnDay(ymd: string, field: string): Date {
  return new Date(parseVnDate(ymd, false, field).getTime() + DAY_MS);
}

export function buildDashboardRange(from: string, to: string): DashboardRange {
  const fromStart = parseVnDate(from, false, 'from');
  const toStart = parseVnDate(to, false, 'to');
  if (from < MIN_DATE) {
    throw badRequest(
      DASHBOARD_ERROR.INVALID_DATE,
      `from không được trước ngày ${MIN_DATE}`,
    );
  }
  if (fromStart > toStart) {
    throw badRequest(
      DASHBOARD_ERROR.INVALID_DATE_RANGE,
      'from không được sau to',
    );
  }

  // GMT+7 không có giờ mùa hè nên mỗi ngày đúng 24 giờ và phép chia này là số nguyên
  const days =
    Math.round((toStart.getTime() - fromStart.getTime()) / DAY_MS) + 1;
  if (days > MAX_RANGE_DAYS) {
    throw badRequest(
      DASHBOARD_ERROR.DATE_RANGE_TOO_LONG,
      `Khoảng ngày không được vượt quá ${MAX_RANGE_DAYS} ngày`,
    );
  }

  // Kỳ trước: liền ngay trước kỳ này, dài đúng bằng kỳ này
  const previousTo = addDaysYmd(from, -1);
  const previousFrom = addDaysYmd(previousTo, -(days - 1));

  const current: UtcBounds = { gte: fromStart, lt: startOfNextVnDay(to, 'to') };
  const previous: UtcBounds = {
    gte: parseVnDate(previousFrom, false, 'previousFrom'),
    lt: fromStart,
  };

  return {
    from,
    to,
    days,
    previousFrom,
    previousTo,
    current,
    previous,
    all: { gte: previous.gte, lt: current.lt },
    dates: listDates(from, days),
    previousDates: listDates(previousFrom, days),
  };
}
