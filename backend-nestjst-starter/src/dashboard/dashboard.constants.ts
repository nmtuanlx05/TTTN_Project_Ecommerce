// Khoảng ngày tối đa của một lần xem (kỳ trước dài bằng kỳ này nên truy vấn quét tối đa gấp đôi)
export const MAX_RANGE_DAYS = 366;
// Ngày sớm nhất cho phép; chặn năm vô lý (Date.UTC ánh xạ năm 0–99 sang 1900–1999)
export const MIN_DATE = '2000-01-01';

export const TOP_PRODUCTS_LIMIT = 5;
export const LOW_STOCK_LIMIT = 5;
export const PENDING_ORDERS_LIMIT = 6;

// Mã lỗi máy đọc được (trường `code`), liệt kê ở docs/api/dashboard.md
export const DASHBOARD_ERROR = {
  INVALID_DATE: 'INVALID_DATE',
  INVALID_DATE_RANGE: 'INVALID_DATE_RANGE',
  DATE_RANGE_TOO_LONG: 'DATE_RANGE_TOO_LONG',
} as const;
