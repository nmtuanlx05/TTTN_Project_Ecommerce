import { Navigate, Outlet, useLocation } from "react-router-dom"
import { useAuthStore } from "@/features/auth/auth-store"

/**
 * Chưa đăng nhập thì sang /login và nhớ đường dẫn đang vào (`state.from`).
 * Phiên đã được khôi phục xong ở `AuthBootstrap` trước khi route này render.
 */
function RequireAuth() {
  const status = useAuthStore((state) => state.status)
  const location = useLocation()

  if (status === "loading") return null
  if (status === "anonymous") {
    const from = `${location.pathname}${location.search}${location.hash}`
    return <Navigate to="/login" replace state={{ from }} />
  }
  return <Outlet />
}

export { RequireAuth }
