import { useMemo } from "react"
import { NewsletterForm } from "@/features/newsletter/components/newsletter-form"
import { StorefrontFooter } from "@/components/storefront/storefront-footer"
import { StorefrontHeader, type HeaderSession } from "@/components/storefront/storefront-header"
import { StorefrontLayout } from "@/components/storefront/storefront-layout"
import { useAuthStore } from "@/features/auth/auth-store"
import { useLogout } from "@/features/auth/queries"
import { useRequireLogin } from "@/features/auth/use-require-login"
import { ROLE_LABEL } from "@/features/users/constants"
import { useCategoryTree } from "@/hooks/use-category-tree"
import { displayName } from "@/lib/display-name"
import { resolveNavItems } from "@/lib/nav-items"
import { STORE } from "@/lib/store-info"
import { useAvatarSaved } from "./use-avatar-saved"

/**
 * Nối phiên đăng nhập, cây danh mục và cổng đăng nhập của giỏ hàng vào khung storefront (components/ không đọc phiên, không gọi API),
 * và truyền form nhận tin (features/newsletter) vào chân trang.
 */
function StorefrontLayoutContainer() {
  const status = useAuthStore((state) => state.status)
  const user = useAuthStore((state) => state.user)
  const logout = useLogout()
  const onAvatarSaved = useAvatarSaved()
  const { tree } = useCategoryTree()
  const requireLogin = useRequireLogin()
  // Cùng nguồn với header (STORE.navItems), nên đường dẫn nhanh ở chân trang luôn khớp thanh điều hướng.
  const quickLinks = useMemo(() => resolveNavItems(STORE.navItems, tree), [tree])

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

  return (
    <StorefrontLayout
      header={
        <StorefrontHeader
          session={session}
          categoryTree={tree}
          // TẠM: chưa có giỏ hàng, xem `useRequireLogin`.
          onCartClick={() => requireLogin()}
        />
      }
      footer={<StorefrontFooter quickLinks={quickLinks} newsletter={<NewsletterForm />} />}
    />
  )
}

export { StorefrontLayoutContainer }
