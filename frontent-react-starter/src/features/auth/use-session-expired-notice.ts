import { useEffect, useState } from "react"
import { useAuthStore } from "./auth-store"

/**
 * `true` nếu người dùng vừa bị đưa về trang đăng nhập do phiên hết hạn hoặc tài khoản
 * bị khóa. Giá trị được chụp lúc mở trang rồi xóa cờ trong store, nên thông báo chỉ hiện một lần.
 */
export function useSessionExpiredNotice(): boolean {
  const [expired] = useState(() => useAuthStore.getState().sessionExpired)
  useEffect(() => {
    useAuthStore.getState().dismissSessionExpired()
  }, [])
  return expired
}
