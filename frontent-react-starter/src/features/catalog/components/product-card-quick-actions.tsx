import { ShoppingBag } from "lucide-react"
import { FavoriteButton } from "@/components/storefront/favorite-button"
import { useWishlistUi } from "@/components/storefront/wishlist-ui-context"
import { PRODUCT_IMAGE_ASPECT } from "@/components/storefront/product-image"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import type { CatalogProductListItem } from "../types"
import { useQuickAdd } from "../use-quick-add"
import { QuickAddDialog } from "./quick-add-dialog"

/**
 * Kiểu chung của hai nút nổi trên ảnh: nền kính mờ (token), hover đảo màu do variant `secondary` trong `.soft-ui`, vòng focus HAI LỚP (`ring` mực + outline `canvas`)
 * để thấy rõ trên ảnh sáng lẫn tối. `REVEAL_ON_HOVER`: ở thiết bị có hover thì ẩn cho tới khi rê chuột vào thẻ hoặc focus bàn phím vào thẻ/nút (hiện bằng mờ dần + trượt nhẹ, trượt chỉ khi
 * không giảm chuyển động); thiết bị cảm ứng (`hover: none`) luôn thấy chúng, nên ẩn bằng `[@media(hover:hover)]` chứ không bằng `hover:` (xem docs/storefront-design.md mục 6).
 * Trái tim ĐÃ chọn không dùng `REVEAL_ON_HOVER`: luôn nhìn thấy để biết sản phẩm đã được yêu thích.
 */
const FLOATING_BUTTON = [
  "pointer-events-auto bg-canvas/80 backdrop-blur-sm transition-[opacity,transform,color,background-color,border-color]",
  "focus-visible:ring-2 focus-visible:ring-ink focus-visible:outline-canvas",
].join(" ")
const REVEAL_ON_HOVER = [
  "[@media(hover:hover)]:opacity-0 [@media(hover:hover)]:motion-safe:translate-y-1",
  "[@media(hover:hover)]:group-hover/card:opacity-100 [@media(hover:hover)]:group-focus-within/card:opacity-100",
  "[@media(hover:hover)]:motion-safe:group-hover/card:translate-y-0 [@media(hover:hover)]:motion-safe:group-focus-within/card:translate-y-0",
].join(" ")

/**
 * Hai nút trên ảnh thẻ: trái tim ở góc trên phải (THẬT, xem `useWishlistUi`: qua cổng đăng nhập, tô đầy khi đã yêu thích, `aria-pressed`, khóa theo từng sản phẩm trong lúc chờ) và "Thêm nhanh" ở đáy
 * (THẬT, xem `useQuickAdd`: qua cổng đăng nhập, thêm thẳng hoặc mở hộp thoại chọn phân loại, rồi mở ngăn kéo giỏ; khóa và hiện vòng quay trong lúc tải chi tiết). Lớp phủ dùng cùng tỉ lệ với khung ảnh (`PRODUCT_IMAGE_ASPECT`), `pointer-events-none` để chỉ hai nút bắt chuột;
 * nằm NGOÀI thẻ `<a>` nên bấm không điều hướng. Thẻ hẹp (< 16rem, đo bằng container query của thẻ): nút nhỏ lại và vùng bấm vẫn đủ 44px nhờ `before:`.
 * Hết hàng thì không có "Thêm nhanh".
 */
function QuickActions({ product }: { product: CatalogProductListItem }) {
  const wishlist = useWishlistUi()
  const quickAdd = useQuickAdd(product.slug)

  return (
    <div className={cn("pointer-events-none absolute inset-x-0 top-0", PRODUCT_IMAGE_ASPECT)}>
      <FavoriteButton
        name={product.name}
        favorite={wishlist.isFavorite(product.id)}
        pending={wishlist.isPending(product.id)}
        onToggle={() => wishlist.toggle(product.id)}
        className={cn(
          FLOATING_BUTTON,
          !wishlist.isFavorite(product.id) && REVEAL_ON_HOVER,
          "absolute top-3 right-3 @max-3xs:top-2 @max-3xs:right-2 @max-3xs:size-9 @max-3xs:before:absolute @max-3xs:before:-inset-1",
        )}
      />
      {product.inStock ? (
        <Button
          type="button"
          variant="secondary"
          aria-label={`Thêm nhanh ${product.name} vào giỏ hàng`}
          loading={quickAdd.loading}
          onClick={quickAdd.start}
          className={cn(
            FLOATING_BUTTON,
            REVEAL_ON_HOVER,
            "absolute inset-x-3 bottom-3 rounded-4xl text-overline uppercase @max-3xs:inset-x-2 @max-3xs:bottom-2 @max-3xs:h-9 @max-3xs:before:absolute @max-3xs:before:-inset-y-1",
          )}
        >
          <ShoppingBag aria-hidden="true" />
          Thêm nhanh
        </Button>
      ) : null}
      {quickAdd.dialog.product ? <QuickAddDialog {...quickAdd.dialog} product={quickAdd.dialog.product} /> : null}
    </div>
  )
}

export { QuickActions }
