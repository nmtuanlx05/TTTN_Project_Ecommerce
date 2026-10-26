import { AdminLayout } from "@/components/admin/admin-layout"
import { useLogout } from "@/features/auth/queries"
import { useCurrentUser } from "@/features/auth/use-current-user"
import { displayName } from "@/lib/display-name"
import { ROLE_LABEL } from "@/features/users/constants"

/** Nối phiên đăng nhập vào khung admin (components/ không được đọc phiên). */
function AdminLayoutContainer() {
  const user = useCurrentUser()
  const logout = useLogout()

  if (!user) return null
  return (
    <AdminLayout
      account={{
        name: displayName(user),
        email: user.email,
        roleLabel: ROLE_LABEL[user.role],
      }}
      role={user.role}
      onLogout={() => logout.mutate()}
      loggingOut={logout.isPending}
    />
  )
}

export { AdminLayoutContainer }
