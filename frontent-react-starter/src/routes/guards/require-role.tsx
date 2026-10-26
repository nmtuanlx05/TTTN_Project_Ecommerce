import type { ReactNode } from "react"
import { Outlet } from "react-router-dom"
import { useCurrentRole } from "@/features/auth/use-current-role"
import ForbiddenPage from "@/pages/forbidden"
import type { Role } from "@/types/user"

/**
 * Sai vai trò thì hiện trang 403 ngay tại chỗ (không chuyển trang). Đặt sau `RequireAuth`.
 * Dùng như route cha (không `children`) hoặc bọc trực tiếp một element.
 * `fullPage`: 403 chiếm cả màn hình, dùng khi chưa có khung admin bên ngoài.
 */
function RequireRole({
  roles,
  fullPage = false,
  children,
}: {
  roles: Role[]
  fullPage?: boolean
  children?: ReactNode
}) {
  const role = useCurrentRole()
  if (!role || !roles.includes(role)) return <ForbiddenPage fullPage={fullPage} />
  return children ?? <Outlet />
}

export { RequireRole }
