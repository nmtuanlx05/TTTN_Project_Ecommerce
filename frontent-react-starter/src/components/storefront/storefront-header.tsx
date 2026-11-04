import { useMemo } from "react"
import { Heart, ShoppingBag } from "lucide-react"
import { BrandLogo } from "@/components/shared/brand-logo"
import { useInView } from "@/hooks/use-in-view"
import type { CategoryTree } from "@/lib/category-tree"
import { resolveNavItems } from "@/lib/nav-items"
import { STORE } from "@/lib/store-info"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { HeaderAccount } from "./header-account"
import { HeaderNav } from "./header-nav"
import type { HeaderSession } from "./header-session"
import { MobileNavDrawer } from "./mobile-nav-drawer"
import { SearchPanel } from "./search-panel"

/** Huy hiệu số lượng trên biểu tượng giỏ: "9+" khi quá 9. Chỉ trang trí (`aria-hidden`); số đọc qua `aria-label` của nút. */
const MAX_BADGE_COUNT = 9

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
      {count > 0 ? (
        <span
          key={count}
          aria-hidden="true"
          className="motion-safe:animate-badge-bump absolute top-1 right-0.5 grid h-4.5 min-w-4.5 place-items-center rounded-4xl bg-primary px-1 text-[0.6875rem] leading-none font-semibold text-primary-fg"
        >
          {count > MAX_BADGE_COUNT ? `${MAX_BADGE_COUNT}+` : count}
        </span>
      ) : null}
    </Button>
  )
}

/**
 * Nút trái tim "Yêu thích" cạnh giỏ hàng: cùng kích thước, kiểu và hover với các nút icon khác, không số đếm. GIAO DIỆN GIẢ (chưa có tính năng yêu thích).
 * Ẩn dưới 380px vì nhóm icon sẽ chạm logo (sau này đưa vào ngăn kéo di động).
 */
function WishlistButton({ onClick }: { onClick?: () => void }) {
  return (
    <Button
      variant="ghost"
      size="icon"
      aria-label="Yêu thích"
      onClick={onClick}
      className="press hidden min-[380px]:inline-flex"
    >
      <Heart className="size-5" />
    </Button>
  )
}

/**
 * Header cửa hàng, dính khi cuộn. Ở đầu trang nền liền với trang; cuộn quá vài px thì nền mờ nhẹ và hiện đường kẻ mảnh
 * (phát hiện bằng một phần tử mốc cao 8px, đặt ngay dưới thanh thông báo ở đầu tài liệu — tức đúng chỗ header đang nằm khi chưa dính —
 * không dùng scroll listener).
 *
 * Từ `xl` (1280px): logo bên trái; thanh điều hướng (`STORE.navItems`) và nhóm biểu tượng (tìm kiếm, giỏ hàng, tài khoản)
 * gom về bên phải, thanh điều hướng cách nhóm biểu tượng 40px. Dưới `xl`: nút menu, logo, tìm kiếm, giỏ hàng; điều hướng và tài khoản
 * nằm trong ngăn kéo (thanh điều hướng đầy đủ không vừa ở 1024px).
 */
function StorefrontHeader({
  session,
  categoryTree = null,
  onCartClick,
  cartCount = 0,
  onWishlistClick,
}: {
  session: HeaderSession
  /** Cây danh mục. Chưa có (đang tải hoặc lỗi) thì các mục danh mục ẩn, chỉ còn mục liên kết thường. */
  categoryTree?: CategoryTree | null
  onCartClick?: () => void
  /** Số sản phẩm mua được trong giỏ (huy hiệu trên icon giỏ); 0 hoặc bỏ trống thì ẩn. */
  cartCount?: number
  /** TẠM: nút "Yêu thích" chỉ là giao diện giả; nơi dựng khung truyền hàm hiện thông báo "chưa có tính năng". */
  onWishlistClick?: () => void
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
            <WishlistButton onClick={onWishlistClick} />
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
