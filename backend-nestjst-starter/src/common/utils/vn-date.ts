import { badRequest } from '../errors/coded-errors';

// GMT+7, tính tường minh để kết quả không phụ thuộc múi giờ máy chủ (khớp VN_UTC_OFFSET_HOURS ở orders.constants.ts)
const VN_UTC_OFFSET_HOURS = 7;

const pad2 = (n: number) => String(n).padStart(2, '0');

// Ngày YYYY-MM-DD theo GMT+7 → mốc thời gian (UTC); ngày không có thật (2026-02-31) thì 400 INVALID_DATE.
// endOfDay=false: 00:00:00.000 của ngày đó; endOfDay=true: 23:59:59.999 của ngày đó.
export function parseVnDate(value: string, endOfDay: boolean, field: string) {
  const time = endOfDay ? '23:59:59.999' : '00:00:00.000';
  const date = new Date(`${value}T${time}+${pad2(VN_UTC_OFFSET_HOURS)}:00`);
  const [y, m, d] = value.split('-').map(Number);
  const probe = new Date(Date.UTC(y, m - 1, d));
  if (
    Number.isNaN(date.getTime()) ||
    probe.getUTCMonth() !== m - 1 ||
    probe.getUTCDate() !== d
  ) {
    throw badRequest('INVALID_DATE', `${field} không phải ngày hợp lệ`);
  }
  return date;
}
