import { Navigate } from "react-router-dom"
import { useCurrentRole } from "@/features/auth/use-current-role"

/** `/admin` trần: ADMIN vào Tổng quan, STAFF vào Đơn hàng (Tổng quan chỉ ADMIN). */
function AdminIndexRedirect() {
  const role = useCurrentRole()
  return <Navigate to={role === "ADMIN" ? "/admin/dashboard" : "/admin/orders"} replace />
}

export { AdminIndexRedirect }
