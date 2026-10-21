// Tên và path của cookie refresh token. Path /auth: trình duyệt chỉ gửi cookie này tới các endpoint /auth/*.
export const REFRESH_COOKIE_NAME = 'refresh_token';
export const REFRESH_COOKIE_PATH = '/auth';

// Thông điệp 401/403 dùng chung
export const MSG_INVALID_CREDENTIALS = 'Email hoặc mật khẩu không đúng';
export const MSG_ACCOUNT_LOCKED = 'Tài khoản đã bị khóa';
export const MSG_UNAUTHORIZED =
  'Bạn chưa đăng nhập hoặc phiên đăng nhập không hợp lệ';
export const MSG_TOKEN_EXPIRED = 'Phiên đăng nhập đã hết hạn';
