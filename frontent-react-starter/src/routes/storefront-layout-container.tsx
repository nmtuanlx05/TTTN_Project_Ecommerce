import { StorefrontHeader, type HeaderSession } from "@/components/storefront/storefront-header"
import { StorefrontLayout } from "@/components/storefront/storefront-layout"
import { useAuthStore } from "@/features/auth/auth-store"
import { useLogout } from "@/features/auth/queries"
import { ROLE_LABEL } from "@/features/users/constants"
import { displayName } from "@/lib/display-name"

/** Nối phiên đăng nhập vào khung storefront (components/ không được đọc phiên). */
function StorefrontLayoutContainer() {
  const status = useAuthStore((state) => state.status)
  const user = useAuthStore((state) => state.user)
  const logout = useLogout()

  const session: HeaderSession =
    status === "authenticated" && user
      ? {
          status: "authenticated",
          account: {
            name: displayName(user),
            email: user.email,
            roleLabel: ROLE_LABEL[user.role],
            canAccessAdmin: user.role !== "CUSTOMER",
          },
          onLogout: () => logout.mutate(),
          loggingOut: logout.isPending,
        }
      : { status: status === "loading" ? "loading" : "anonymous" }

  return <StorefrontLayout header={<StorefrontHeader session={session} />} />
}

export { StorefrontLayoutContainer }
