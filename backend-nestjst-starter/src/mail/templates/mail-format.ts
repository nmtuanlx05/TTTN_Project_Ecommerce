// Định dạng số tiền và ngày cho mail. Tự viết, KHÔNG dùng Intl: kết quả không phụ thuộc ICU/locale của máy chạy.

// 500000 => "500.000₫"
export function formatVnd(amount: number): string {
  const rounded = Math.round(amount);
  const digits = String(Math.abs(rounded)).replace(
    /\B(?=(\d{3})+(?!\d))/g,
    '.',
  );
  return `${rounded < 0 ? '-' : ''}${digits}₫`;
}

const VN_UTC_OFFSET_MS = 7 * 60 * 60 * 1000; // Asia/Ho_Chi_Minh: UTC+7, không có giờ mùa hè

// dd/mm/yyyy theo giờ Việt Nam. Ví dụ 2027-06-30T16:59:59Z (= 23:59:59 ngày 30/06 giờ VN) => "30/06/2027".
export function formatVnDate(date: Date): string {
  const shifted = new Date(date.getTime() + VN_UTC_OFFSET_MS);
  const dd = String(shifted.getUTCDate()).padStart(2, '0');
  const mm = String(shifted.getUTCMonth() + 1).padStart(2, '0');
  return `${dd}/${mm}/${shifted.getUTCFullYear()}`;
}

// dd/MM/yyyy HH:mm theo giờ Việt Nam (24 giờ, bỏ giây). Ví dụ 2026-11-26T17:00:00Z => "27/11/2026 00:00".
export function formatVnDateTime(date: Date): string {
  const shifted = new Date(date.getTime() + VN_UTC_OFFSET_MS);
  const hh = String(shifted.getUTCHours()).padStart(2, '0');
  const mi = String(shifted.getUTCMinutes()).padStart(2, '0');
  return `${formatVnDate(date)} ${hh}:${mi}`;
}
