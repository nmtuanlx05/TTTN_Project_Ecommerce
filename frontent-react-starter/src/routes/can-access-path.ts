import { NAV_ITEMS } from "@/components/admin/nav-items"
import type { Role } from "@/types/user"

/**
 * Vai trò này có vào được đường dẫn không (đoán theo bảng quyền để chọn trang đích
 * sau đăng nhập; chặn thật vẫn là `RequireRole`). Ngoài /admin thì ai cũng vào được.
 */
export function canAccessPath(role: Role, path: string): boolean {
  const pathname = path.split(/[?#]/)[0]
  if (pathname !== "/admin" && !pathname.startsWith("/admin/")) return true
  if (role === "CUSTOMER") return false
  const item = NAV_ITEMS.find(
    (navItem) => pathname === navItem.to || pathname.startsWith(`${navItem.to}/`),
  )
  return item ? item.roles.includes(role) : true
}
