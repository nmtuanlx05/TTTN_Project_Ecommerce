import { useLocation, useNavigate } from "react-router-dom"
import { useToast } from "@/components/ui/toast"
import { useAuthStore } from "./auth-store"

/**
 * Cổng đăng nhập cho hành động mua (thêm vào giỏ, mở giỏ). Trả về hàm `requireLogin(onCustomer)`:
 * - Khách chưa đăng nhập: sang `/login` kèm `state.from` là trang đang xem; đăng nhập xong `RedirectIfAuthenticated`
 *   đưa về đúng trang đó (cơ chế sẵn có của `RequireAuth`).
 * - ADMIN/STAFF: toast "Tài khoản quản trị không dùng để mua hàng".
 * - CUSTOMER: chạy `onCustomer`.
 *
 * TẠM (nhánh giỏ hàng sẽ thay): chưa có giỏ hàng nên `onCustomer` mặc định chỉ hiện toast "Giỏ hàng sẽ sớm có mặt".
 * Khi có giỏ hàng thật, truyền hành động thật vào `onCustomer` ở nơi gọi và xóa nhánh mặc định này.
 */
export function useRequireLogin() {
  const user = useAuthStore((state) => state.user)
  const location = useLocation()
  const navigate = useNavigate()
  const toast = useToast()

  return (onCustomer?: () => void) => {
    if (!user) {
      const from = `${location.pathname}${location.search}${location.hash}`
      navigate("/login", { state: { from } })
      return
    }
    if (user.role !== "CUSTOMER") {
      toast.add({ title: "Tài khoản quản trị không dùng để mua hàng", data: { tone: "info" } })
      return
    }
    if (onCustomer) onCustomer()
    else toast.add({ title: "Giỏ hàng sẽ sớm có mặt", data: { tone: "info" } })
  }
}
