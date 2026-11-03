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

/**
 * Giữ đường dẫn cần quay lại (`state.from`) khi người dùng chuyển giữa /login và /register (liên kết chéo, và chuyển sang
 * /login sau khi đăng ký). Chỉ truyền đi giá trị an toàn; `RedirectIfAuthenticated` vẫn kiểm lại lần nữa trước khi dùng.
 */
export function returnPathState(state: unknown): { from: string } | undefined {
  const from = (state as { from?: unknown } | null)?.from
  return isSafeRedirectPath(from) ? { from } : undefined
}

/** Trang đích khi đăng nhập mà không có đường dẫn cũ cần quay lại. */
export function landingPathFor(role: Role): string {
  if (role === "ADMIN") return "/admin"
  if (role === "STAFF") return "/admin/orders"
  return "/"
}
