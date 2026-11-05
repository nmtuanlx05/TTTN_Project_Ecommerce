import { useMemo } from "react"
import { NewsletterForm } from "@/features/newsletter/components/newsletter-form"
import { WishlistUiContext } from "@/components/storefront/wishlist-ui-context"
import { CartUiContext, type CartAddInput } from "@/components/storefront/cart-ui-context"
import { StorefrontFooter } from "@/components/storefront/storefront-footer"
import { StorefrontHeader, type HeaderSession } from "@/components/storefront/storefront-header"
import { StorefrontLayout } from "@/components/storefront/storefront-layout"
import { useAuthStore } from "@/features/auth/auth-store"
import { useLogout } from "@/features/auth/queries"
import { useCurrentRole } from "@/features/auth/use-current-role"
import { useRequireLogin } from "@/features/auth/use-require-login"
import { CartDrawer } from "@/features/cart/components/cart-drawer"
import { useAddToCart, useCart } from "@/features/cart/queries"
import { WishlistDrawer } from "@/features/wishlist/components/wishlist-drawer"
import { useOrdersSummary } from "@/features/orders/queries"
import { ROLE_LABEL } from "@/features/users/constants"
import { useCategoryTree } from "@/hooks/use-category-tree"
import { useOpenUntilNavigation } from "@/hooks/use-open-until-navigation"
import { displayName } from "@/lib/display-name"
import { resolveNavItems } from "@/lib/nav-items"
import { STORE } from "@/lib/store-info"
import { renderInlineAddToCart } from "./render-inline-add"
import { useAvatarSaved } from "./use-avatar-saved"
import { useWishlistWiring } from "./use-wishlist-wiring"

/**
 * Nối phiên đăng nhập, cây danh mục và giỏ hàng vào khung storefront (components/ không đọc phiên, không gọi API),
 * và truyền form nhận tin (features/newsletter) vào chân trang. Đây là nơi duy nhất biết cả features/cart lẫn features/catalog: ngăn kéo giỏ, huy hiệu ở header và
 * `CartUiContext.Provider` (cổng đăng nhập + thêm vào giỏ + mở giỏ cho trang chi tiết và thẻ sản phẩm) và `WishlistUiContext.Provider` + ngăn kéo yêu thích (xem `use-wishlist-wiring`). Giỏ và yêu thích chỉ được tải cho CUSTOMER; mở ngăn kéo tự đóng khi đổi trang.
 */
function StorefrontLayoutContainer() {
  const status = useAuthStore((state) => state.status)
  const user = useAuthStore((state) => state.user)
  const logout = useLogout()
  const onAvatarSaved = useAvatarSaved()
  const { tree } = useCategoryTree()
  const requireLogin = useRequireLogin()
  const isCustomer = useCurrentRole() === "CUSTOMER"
  const cart = useCart({ enabled: isCustomer })
  const ordersSummary = useOrdersSummary({ enabled: isCustomer })
  const addItem = useAddToCart()
  const [cartOpen, setCartOpen] = useOpenUntilNavigation()
  const wishlist = useWishlistWiring(requireLogin, cartOpen)

  // Lỗi đã được toast trong `useAddToCart`; ở đây chỉ báo thành công/thất bại để nơi gọi biết có đóng hộp thoại hay không.
  const addToCart = async (input: CartAddInput, options?: { openCart?: boolean }) => {
    let allowed = false
    requireLogin(() => {
      allowed = true
    })
    if (!allowed) return false
    try {
      await addItem.mutateAsync(input)
    } catch {
      return false
    }
    if (options?.openCart !== false) setCartOpen(true)
    return true
  }
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
          // Mục "Đơn hàng của tôi" chỉ cho CUSTOMER; huy hiệu là số đơn đang hoạt động (ẩn khi 0 hoặc chưa tải).
          ordersLink: isCustomer ? { count: ordersSummary.data?.active ?? 0 } : undefined,
        }
      : { status: status === "loading" ? "loading" : "anonymous" }

  return (
    <WishlistUiContext.Provider value={wishlist.ui}>
      <CartUiContext.Provider
        value={{ requireLogin, addToCart, openCart: () => setCartOpen(true), adding: addItem.isPending }}
      >
        <StorefrontLayout
          header={
            <StorefrontHeader
              session={session}
              categoryTree={tree}
              onCartClick={() => requireLogin(() => setCartOpen(true))}
              cartCount={isCustomer && cart.data ? cart.data.itemCount : 0}
              onWishlistClick={wishlist.ui.openWishlist}
              wishlistCount={wishlist.count}
            />
          }
          footer={<StorefrontFooter quickLinks={quickLinks} newsletter={<NewsletterForm />} />}
        />
        {isCustomer ? (
          <CartDrawer
            open={cartOpen}
            onOpenChange={setCartOpen}
            handoffIn={wishlist.handoff}
            finalFocus={wishlist.cartFinalFocus}
          />
        ) : null}
        {wishlist.isCustomer ? (
          <WishlistDrawer
            open={wishlist.open}
            onOpenChange={wishlist.setOpen}
            count={wishlist.count}
            isPending={wishlist.isPending}
            onToggle={wishlist.onRemove}
            renderAddToCart={renderInlineAddToCart}
            handingOff={wishlist.handoff}
          />
        ) : null}
      </CartUiContext.Provider>
    </WishlistUiContext.Provider>
  )
}

export { StorefrontLayoutContainer }
