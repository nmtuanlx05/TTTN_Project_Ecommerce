import { useLocation, useNavigate } from "react-router-dom"
import { useToast } from "@/components/ui/toast"
import { useAuthStore } from "./auth-store"

export interface RequireLoginMessages {
  guest?: string
  admin?: string
}

/**
 * Cổng đăng nhập cho hành động mua (thêm vào giỏ, mở giỏ). Trả về hàm `requireLogin(onCustomer)`:
 * - Khách chưa đăng nhập: sang `/login` kèm `state.from` là trang đang xem; đăng nhập xong `RedirectIfAuthenticated`
 *   đưa về đúng trang đó (cơ chế sẵn có của `RequireAuth`).
 * - ADMIN/STAFF: toast "Tài khoản quản trị không dùng để mua hàng".
 * - CUSTOMER: chạy `onCustomer`.
 *
 * `onCustomer` là hành động thật (mở giỏ, thêm vào giỏ...) do nơi gọi truyền vào.
 *
 * `messages` (tùy chọn, mỗi lần gọi): khách chưa đăng nhập thì toast `guest` TRƯỚC khi chuyển sang /login; ADMIN/STAFF thì toast `admin`
 * thay cho câu mặc định. Không truyền thì hành vi y như cũ (khách không toast, quản trị thấy câu mua hàng).
 */
export function useRequireLogin() {
  const user = useAuthStore((state) => state.user)
  const location = useLocation()
  const navigate = useNavigate()
  const toast = useToast()

  return (onCustomer: () => void, messages?: RequireLoginMessages) => {
    if (!user) {
      if (messages?.guest) toast.add({ title: messages.guest, data: { tone: "info" } })
      const from = `${location.pathname}${location.search}${location.hash}`
      navigate("/login", { state: { from } })
      return
    }
    if (user.role !== "CUSTOMER") {
      toast.add({ title: messages?.admin ?? "Tài khoản quản trị không dùng để mua hàng", data: { tone: "info" } })
      return
    }
    onCustomer()
  }
}
