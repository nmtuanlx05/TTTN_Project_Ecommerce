import { usePendingOrdersCount } from "@/features/admin-orders/queries"
import { AdminLayout } from "@/components/admin/admin-layout"
import { useLogout } from "@/features/auth/queries"
import { useCurrentUser } from "@/features/auth/use-current-user"
import { displayName } from "@/lib/display-name"
import { ROLE_LABEL } from "@/features/users/constants"
import { useAvatarSaved } from "./use-avatar-saved"

/** Nối phiên đăng nhập vào khung admin (components/ không được đọc phiên). */
function AdminLayoutContainer() {
  const user = useCurrentUser()
  const logout = useLogout()
  const onAvatarSaved = useAvatarSaved()
  const pendingOrders = usePendingOrdersCount()

  if (!user) return null
  return (
    <AdminLayout
      account={{
        name: displayName(user),
        fullName: user.name,
        email: user.email,
        avatarUrl: user.avatarUrl,
        roleLabel: ROLE_LABEL[user.role],
      }}
      role={user.role}
      onLogout={() => logout.mutate()}
      loggingOut={logout.isPending}
      onAvatarSaved={onAvatarSaved}
      navCounts={{
        "/admin/orders": { count: pendingOrders.data ?? 0, label: "đơn chờ xác nhận" },
      }}
    />
  )
}

export { AdminLayoutContainer }
