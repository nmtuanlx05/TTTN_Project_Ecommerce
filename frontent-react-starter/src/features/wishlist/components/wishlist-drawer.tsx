import { Link } from "react-router-dom"
import { StorefrontDrawer } from "@/components/storefront/storefront-drawer"
import { Button, buttonVariants } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { useWishlist } from "../queries"
import type { WishlistAddToCartSlot } from "../types"
import { WishlistDrawerHeader } from "./wishlist-drawer-header"
import { WishlistGrid } from "./wishlist-grid"
import { WishlistEmpty, WishlistError, WishlistSkeleton } from "./wishlist-states"

/**
 * Ngăn kéo "Sản phẩm yêu thích" (trượt từ phải), dùng đúng khung `StorefrontDrawer` như ngăn kéo giỏ: khóa cuộn, giữ focus, Esc/bấm nền đóng, trả focus về nút đã mở. Chỉ được dựng cho CUSTOMER.
 * Render ở portal ngoài `<main>` nên tự gắn `soft-ui`. `count` (độ dài mảng ids, cùng nguồn với huy hiệu header) do nơi ghép truyền vào; danh sách chỉ tải khi ngăn kéo mở.
 * `handingOff`: giỏ vừa mở từ đây (thêm vào giỏ thành công) nên ngăn kéo này trượt ra ngắn và nhường focus. Phân trang bằng nút "Xem thêm" (`useInfiniteQuery`); bỏ thẻ là lạc quan (xem `useToggleWishlist`), danh sách rỗng thì hiện trạng thái rỗng ngay.
 */
function WishlistDrawer({
  open,
  onOpenChange,
  count,
  isPending,
  onToggle,
  renderAddToCart,
  handingOff = false,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  count: number
  isPending: (productId: number) => boolean
  onToggle: (productId: number) => void
  renderAddToCart: WishlistAddToCartSlot
  /** Đang chuyển sang ngăn kéo khác (giỏ hàng): chuyển cảnh liền mạch và KHÔNG trả focus (ngăn kéo vào đã nhận). Do routes truyền, mặc định tắt. */
  handingOff?: boolean
}) {
  const query = useWishlist({ enabled: open })
  const items = query.data?.pages.flatMap((page) => page.items) ?? []
  const close = () => onOpenChange(false)

  let body
  if (query.data && items.length > 0) {
    body = (
      <>
        <WishlistGrid items={items} isPending={isPending} onToggle={onToggle} onNavigate={close} renderAddToCart={renderAddToCart} />
        {query.hasNextPage ? (
          <div className="flex flex-col items-center gap-2 pb-6">
            {query.isFetchNextPageError ? (
              <p role="alert" className="text-caption text-danger-fg">
                Không tải được thêm sản phẩm.
              </p>
            ) : null}
            <Button
              type="button"
              variant="outline"
              loading={query.isFetchingNextPage}
              onClick={() => void query.fetchNextPage()}
              className="press rounded-4xl border-border-control"
            >
              Xem thêm
            </Button>
          </div>
        ) : null}
      </>
    )
  } else if (query.data) {
    body = (
      <WishlistEmpty
        action={
          <Link to="/products" onClick={close} className={cn(buttonVariants(), "press rounded-4xl")}>
            Khám phá sản phẩm
          </Link>
        }
      />
    )
  } else if (query.isError) {
    body = <WishlistError onRetry={() => void query.refetch()} />
  } else {
    body = <WishlistSkeleton />
  }

  const centered = query.data !== undefined && items.length === 0

  return (
    <StorefrontDrawer
      open={open}
      onOpenChange={onOpenChange}
      side="right"
      title="Sản phẩm yêu thích"
      hideHeader
      titleInChildren
      handoff={handingOff ? "out" : undefined}
      finalFocus={handingOff ? false : undefined}
      className="soft-ui w-full max-w-none sm:max-w-[29rem] sm:rounded-l-panel"
    >
      <WishlistDrawerHeader count={count} />
      <div className={cn("scrollbar-soft min-h-0 flex-1 overflow-y-auto px-gutter pt-6", centered && "flex flex-col justify-center pt-0")}>
        {body}
      </div>
    </StorefrontDrawer>
  )
}

export { WishlistDrawer }
