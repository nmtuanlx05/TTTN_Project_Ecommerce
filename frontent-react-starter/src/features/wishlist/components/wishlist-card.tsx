import { Link } from "react-router-dom"
import { FavoriteButton } from "@/components/storefront/favorite-button"
import { ProductImage } from "@/components/storefront/product-image"
import { Button } from "@/components/ui/button"
import { formatVnd } from "@/lib/format"
import { cn } from "@/lib/utils"
import { WISHLIST_EXPANDED_FULL_ROW, WISHLIST_STATUS_LABEL } from "../constants"
import { wishlistStatusOf } from "../status"
import type { WishlistAddToCartSlot, WishlistItem } from "../types"

/**
 * Một thẻ trong ngăn kéo (ảnh 3:4, tim tô đầy ở góc trên phải, tên, giá, nút thêm vào giỏ). Tim luôn bấm được để bỏ, kể cả sản phẩm không còn bán.
 * Theo `wishlistStatusOf`: `available` bình thường (nút thêm là slot `renderAddToCart`); `sold-out` ("Hết hàng") mờ, nút khóa nhưng VẪN dẫn tới trang chi tiết;
 * `discontinued` ("Ngừng kinh doanh") mờ, nút khóa và KHÔNG có liên kết (trang chi tiết 404). Chữ giữ `ink-muted` thay vì giảm độ mờ cả thẻ để đủ tương phản.
 * `onNavigate`: đóng ngăn kéo khi bấm liên kết (bấm cùng đường dẫn thì pathname không đổi, hook mở-tới-khi-điều-hướng không tự đóng).
 */
function WishlistCard({
  item,
  expanded,
  onExpandedChange,
  pending,
  onToggle,
  onNavigate,
  renderAddToCart,
}: {
  item: WishlistItem
  expanded: boolean
  onExpandedChange: (expanded: boolean) => void
  pending: boolean
  onToggle: () => void
  onNavigate: () => void
  renderAddToCart: WishlistAddToCartSlot
}) {
  const status = wishlistStatusOf(item)
  const label = WISHLIST_STATUS_LABEL[status]
  const href = `/products/${encodeURIComponent(item.slug)}`
  const dimmed = status !== "available"
  const image = <ProductImage src={item.imageUrl} alt="" className={cn(dimmed && "opacity-60")} />

  return (
    <li className={cn("flex min-w-0 flex-col gap-3", expanded && WISHLIST_EXPANDED_FULL_ROW && "col-span-2")}>
      <div className="relative">
        {status === "discontinued" ? (
          image
        ) : (
          <Link to={href} onClick={onNavigate} tabIndex={-1} aria-hidden="true" className="block">
            {image}
          </Link>
        )}
        <FavoriteButton
          name={item.name}
          favorite
          pending={pending}
          onToggle={onToggle}
          className="absolute top-3 right-3 bg-canvas text-ink focus-visible:ring-2 focus-visible:ring-ink focus-visible:outline-canvas"
        />
      </div>
      <div className="flex flex-col gap-1">
        {status === "discontinued" ? (
          <span className="line-clamp-2 text-body-sm text-ink-muted">{item.name}</span>
        ) : (
          <Link
            to={href}
            onClick={onNavigate}
            className={cn(
              "line-clamp-2 text-body-sm underline decoration-transparent underline-offset-4 transition-colors duration-(--motion-fast) ease-smooth hover:decoration-ink",
              dimmed ? "text-ink-muted" : "text-ink",
            )}
          >
            {item.name}
          </Link>
        )}
        <span className="text-body-sm text-ink-muted">{formatVnd(item.price)}</span>
      </div>
      {label ? (
        <Button type="button" variant="outline" disabled className="w-full rounded-4xl border-border-control">
          {label}
        </Button>
      ) : (
        renderAddToCart({ item, expanded, onExpandedChange })
      )}
    </li>
  )
}

export { WishlistCard }
