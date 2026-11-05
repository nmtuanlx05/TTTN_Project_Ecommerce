import { Outlet } from "react-router-dom"
import { ShieldAlert } from "lucide-react"
import { AccountSidebar } from "@/components/storefront/account-sidebar"
import type { AccountOutletContext } from "@/components/storefront/account-context"
import { PageContainer } from "@/components/storefront/page-container"
import { StateMessage } from "@/components/storefront/state-message"
import { useToast } from "@/components/ui/toast"
import { useAuthStore } from "@/features/auth/auth-store"
import { useLogout } from "@/features/auth/queries"
import { displayName } from "@/lib/display-name"
import { STORE } from "@/lib/store-info"

/**
 * Layout `/tai-khoan/*` (trong `RequireAuth`): nối phiên đăng nhập vào thanh bên rồi đưa xuống trang con qua `Outlet context`.
 * Chỉ CUSTOMER dùng khu này; ADMIN/STAFF chỉ thấy thông báo và các trang con KHÔNG được dựng (nên không gọi API đơn hàng).
 */
function AccountLayoutContainer() {
  const user = useAuthStore((state) => state.user)
  const logout = useLogout()
  const toast = useToast()

  if (!user) return null
  if (user.role !== "CUSTOMER") {
    return (
      <PageContainer className="pt-8 pb-block lg:pt-16">
        <StateMessage icon={ShieldAlert} title="Tài khoản quản trị không dùng để mua hàng" titleAs="h1" />
      </PageContainer>
    )
  }

  const context: AccountOutletContext = {
    sidebar: (
      <AccountSidebar
        account={{ name: displayName(user), fullName: user.name, email: user.email, avatarUrl: user.avatarUrl }}
        onLogout={() => logout.mutate()}
        loggingOut={logout.isPending}
        // TẠM: yêu thích chưa có, cùng cách với trái tim ở header.
        onWishlistClick={() => toast.add({ title: STORE.comingSoon.wishlist, data: { tone: "info" } })}
      />
    ),
  }
  return <Outlet context={context} />
}

export { AccountLayoutContainer }
