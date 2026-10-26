/**
 * Nguồn duy nhất của quy tắc mật khẩu ở frontend. Khớp `@MinLength` của RegisterDto và
 * CreateUserDto ở backend. Không viết số này (hay độ dài khác) ở nơi nào khác: schema, mô tả
 * dưới ô và thông báo lỗi đều lấy từ đây. Đăng nhập không kiểm độ dài, chỉ kiểm không để trống.
 */
export const PASSWORD_MIN_LENGTH = 6

/** Mô tả dưới ô nhập mật khẩu của form tạo mật khẩu (đăng ký, thêm người dùng). */
export const PASSWORD_HINT = `Tối thiểu ${PASSWORD_MIN_LENGTH} ký tự.`

/** Thông báo khi mật khẩu quá ngắn. */
export const PASSWORD_TOO_SHORT_MESSAGE = `Mật khẩu quá ngắn. Nhập ít nhất ${PASSWORD_MIN_LENGTH} ký tự.`
