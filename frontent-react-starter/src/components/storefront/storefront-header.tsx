import { useMemo } from "react"
import { Heart, ShoppingBag } from "lucide-react"
import { BrandLogo } from "@/components/shared/brand-logo"
import { useInView } from "@/hooks/use-in-view"
import type { CategoryTree } from "@/lib/category-tree"
import { resolveNavItems } from "@/lib/nav-items"
import { STORE } from "@/lib/store-info"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { CountBadge } from "./count-badge"
import { HeaderAccount } from "./header-account"
import { HeaderNav } from "./header-nav"
import type { HeaderSession } from "./header-session"
import { MobileNavDrawer } from "./mobile-nav-drawer"
import { SearchPanel } from "./search-panel"

/** Ngưỡng "N+" của huy hiệu: giỏ hiện "9+", yêu thích "99+" (trần wishlist là 100). */
const MAX_CART_BADGE = 9
const MAX_WISHLIST_BADGE = 99

/**
 * Biểu tượng giỏ hàng ở header. Là nút (không phải liên kết): mở ngăn kéo giỏ, và khách phải qua cổng đăng nhập.
 * `count` là số sản phẩm mua được trong giỏ; 0 hoặc chưa biết (chưa đăng nhập, không phải CUSTOMER, lỗi mạng) thì không có huy hiệu.
 */
function CartButton({ onClick, count = 0 }: { onClick?: () => void; count?: number }) {
  return (
    <Button
      variant="ghost"
      size="icon"
      aria-label={count > 0 ? `Giỏ hàng, ${count} sản phẩm` : "Giỏ hàng"}
      onClick={onClick}
      className="press"
    >
      <ShoppingBag className="size-5" />
      <CountBadge count={count} max={MAX_CART_BADGE} />
    </Button>
  )
}

/**
 * Nút trái tim "Yêu thích" cạnh giỏ hàng: mở ngăn kéo yêu thích (khách phải qua cổng đăng nhập, do nơi dựng khung xử lý). `count` là số sản phẩm yêu thích (độ dài mảng ids);
 * 0 hoặc chưa biết thì không có huy hiệu. Ẩn dưới 380px vì nhóm icon sẽ chạm logo (vẫn mở được từ thanh bên tài khoản).
 */
function WishlistButton({ onClick, count = 0 }: { onClick?: () => void; count?: number }) {
  return (
    <Button
      variant="ghost"
      size="icon"
      aria-label={count > 0 ? `Yêu thích, ${count} sản phẩm` : "Yêu thích"}
      aria-haspopup="dialog"
      onClick={onClick}
      className="press hidden min-[380px]:inline-flex"
    >
      <Heart className="size-5" />
      <CountBadge count={count} max={MAX_WISHLIST_BADGE} />
    </Button>
  )
}

/**
 * Header cửa hàng, dính khi cuộn. Ở đầu trang nền liền với trang; cuộn quá vài px thì nền mờ nhẹ và hiện đường kẻ mảnh
 * (phát hiện bằng một phần tử mốc cao 8px, đặt ngay dưới thanh thông báo ở đầu tài liệu — tức đúng chỗ header đang nằm khi chưa dính —
 * không dùng scroll listener).
 *
 * Từ `xl` (1280px): logo bên trái; thanh điều hướng (`STORE.navItems`) và nhóm biểu tượng (tìm kiếm, yêu thích, giỏ hàng, tài khoản)
 * gom về bên phải, thanh điều hướng cách nhóm biểu tượng 40px. Dưới `xl`: nút menu, logo, tìm kiếm, giỏ hàng; điều hướng và tài khoản
 * nằm trong ngăn kéo (thanh điều hướng đầy đủ không vừa ở 1024px).
 */
function StorefrontHeader({
  session,
  categoryTree = null,
  onCartClick,
  cartCount = 0,
  onWishlistClick,
  wishlistCount = 0,
}: {
  session: HeaderSession
  /** Cây danh mục. Chưa có (đang tải hoặc lỗi) thì các mục danh mục ẩn, chỉ còn mục liên kết thường. */
  categoryTree?: CategoryTree | null
  onCartClick?: () => void
  /** Số sản phẩm mua được trong giỏ (huy hiệu trên icon giỏ); 0 hoặc bỏ trống thì ẩn. */
  cartCount?: number
  /** Mở ngăn kéo yêu thích (nơi dựng khung đã gồm cổng đăng nhập). */
  onWishlistClick?: () => void
  /** Số sản phẩm yêu thích (huy hiệu trên icon trái tim); 0 hoặc bỏ trống thì ẩn. */
  wishlistCount?: number
}) {
  const { ref, inView } = useInView<HTMLDivElement>({ initialInView: true })
  const scrolled = !inView
  const navItems = useMemo(() => resolveNavItems(STORE.navItems, categoryTree), [categoryTree])

  return (
    <>
      <div ref={ref} aria-hidden="true" className="pointer-events-none absolute inset-x-0 top-announcement h-2" />
      <header
        className={cn(
          "sticky top-0 z-30 border-b transition-[background-color,border-color] duration-(--motion-base) ease-smooth",
          scrolled ? "border-border-subtle bg-canvas/80 backdrop-blur-md" : "border-transparent bg-canvas",
        )}
      >
        <div className="mx-auto flex h-header w-full max-w-7xl items-center gap-2 px-gutter xl:gap-0">
          <MobileNavDrawer items={navItems} session={session} />
          <BrandLogo to="/" />
          <HeaderNav items={navItems} className="ml-auto max-xl:hidden xl:flex" />
          <div className="ml-auto flex items-center gap-1 xl:ml-10 xl:gap-inline">
            <SearchPanel />
            <WishlistButton onClick={onWishlistClick} count={wishlistCount} />
            <CartButton onClick={onCartClick} count={cartCount} />
            <div className="max-xl:hidden">
              <HeaderAccount session={session} />
            </div>
          </div>
        </div>
      </header>
    </>
  )
}

export { StorefrontHeader }
export type { HeaderSession }
