import { Navigate, Outlet, useLocation } from "react-router-dom"
import { useAuthStore } from "@/features/auth/auth-store"
import { isSafeRedirectPath, landingPathFor } from "@/features/auth/safe-redirect"
import { canAccessPath } from "@/routes/can-access-path"

/**
 * Cho /login và /register: đã đăng nhập thì đi tiếp. Đích là đường dẫn trước đó
 * (`state.from`) nếu hợp lệ, là đường dẫn nội bộ và vai trò hiện tại vào được; không thì
 * về trang mặc định theo vai trò. Đây là nơi duy nhất quyết định trang đích sau đăng nhập.
 */
function RedirectIfAuthenticated() {
  const user = useAuthStore((state) => state.user)
  const location = useLocation()

  if (!user) return <Outlet />

  const from: unknown = (location.state as { from?: unknown } | null)?.from
  const target =
    isSafeRedirectPath(from) &&
    from !== "/login" &&
    from !== "/register" &&
    canAccessPath(user.role, from)
      ? from
      : landingPathFor(user.role)
  return <Navigate to={target} replace />
}

export { RedirectIfAuthenticated }
