import { StorefrontHeader, type HeaderSession } from "@/components/storefront/storefront-header"
import { StorefrontLayout } from "@/components/storefront/storefront-layout"
import { useAuthStore } from "@/features/auth/auth-store"
import { useLogout } from "@/features/auth/queries"
import { ROLE_LABEL } from "@/features/users/constants"
import { displayName } from "@/lib/display-name"
import { useAvatarSaved } from "./use-avatar-saved"

/** Nối phiên đăng nhập vào khung storefront (components/ không được đọc phiên). */
function StorefrontLayoutContainer() {
  const status = useAuthStore((state) => state.status)
  const user = useAuthStore((state) => state.user)
  const logout = useLogout()
  const onAvatarSaved = useAvatarSaved()

  const session: HeaderSession =
    status === "authenticated" && user
      ? {
          status: "authenticated",
          account: {
            name: displayName(user),
            fullName: user.name,
            email: user.email,
            avatarUrl: user.avatarUrl,
            roleLabel: ROLE_LABEL[user.role],
            canAccessAdmin: user.role !== "CUSTOMER",
          },
          onLogout: () => logout.mutate(),
          loggingOut: logout.isPending,
          onAvatarSaved,
        }
      : { status: status === "loading" ? "loading" : "anonymous" }

  return <StorefrontLayout header={<StorefrontHeader session={session} />} />
}

export { StorefrontLayoutContainer }
