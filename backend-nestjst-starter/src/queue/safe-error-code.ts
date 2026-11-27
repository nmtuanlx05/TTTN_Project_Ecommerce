// Mã lỗi an toàn để ghi log khi đặt job thất bại. KHÔNG bao giờ ghi message thô: lỗi Redis/BullMQ có thể chứa
// URL kết nối (kèm mật khẩu) hay dữ liệu khác. Chỉ nhận trường `code` dạng chữ hoa/số/gạch dưới (vd ECONNREFUSED).
// Cùng quy tắc với logWelcomeFailure ở auth.service.ts (chưa gộp, để không sửa auth trong PR này).

export const UNKNOWN_ERROR_CODE = 'UNKNOWN';

const SAFE_CODE = /^[A-Z][A-Z0-9_]{1,30}$/;

export function safeErrorCode(error: unknown): string {
  const code = (error as { code?: unknown } | null | undefined)?.code;
  return typeof code === 'string' && SAFE_CODE.test(code)
    ? code
    : UNKNOWN_ERROR_CODE;
}
