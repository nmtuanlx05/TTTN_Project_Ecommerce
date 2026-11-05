import type { ReactNode } from "react"
import { useOutletContext } from "react-router-dom"

/** Dữ liệu layout `/tai-khoan` (`routes/account-layout-container.tsx`) đưa xuống các trang con qua `<Outlet context>`. */
export interface AccountOutletContext {
  /** Thanh bên đã dựng sẵn (đã nối phiên đăng nhập); trang đặt vào `AccountShell`. */
  sidebar: ReactNode
}

/** Thanh bên tài khoản do layout cung cấp. Chỉ gọi trong trang con của `/tai-khoan`. */
export function useAccountSidebar(): ReactNode {
  return useOutletContext<AccountOutletContext>().sidebar
}
