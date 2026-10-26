import type { Role } from "@/types/user"

/**
 * Chỉ nhận đường dẫn nội bộ để tránh open redirect: bắt đầu bằng một "/", không phải
 * "//" (URL cùng giao thức), không có "\" (trình duyệt coi "/\" như "//") hay ký tự điều khiển.
 */
export function isSafeRedirectPath(value: unknown): value is string {
  if (typeof value !== "string") return false
  if (!value.startsWith("/") || value.startsWith("//")) return false
  // eslint-disable-next-line no-control-regex
  return !/[\\\u0000-\u001f]/.test(value)
}

/** Trang đích khi đăng nhập mà không có đường dẫn cũ cần quay lại. */
export function landingPathFor(role: Role): string {
  if (role === "ADMIN") return "/admin"
  if (role === "STAFF") return "/admin/orders"
  return "/"
}
