import { Heart, ShoppingBag } from "lucide-react"
import { PRODUCT_IMAGE_ASPECT } from "@/components/storefront/product-image"
import { Button } from "@/components/ui/button"
import { useToast } from "@/components/ui/toast"
import { STORE } from "@/lib/store-info"
import { cn } from "@/lib/utils"
import type { CatalogProductListItem } from "../types"

/**
 * Kiểu chung của hai nút nổi trên ảnh: nền kính mờ (token), hover đảo màu do variant `secondary` trong `.soft-ui`, vòng focus HAI LỚP (`ring` mực + outline `canvas`)
 * để thấy rõ trên ảnh sáng lẫn tối. Ở thiết bị có hover thì ẩn cho tới khi rê chuột vào thẻ hoặc focus bàn phím vào thẻ/nút (hiện bằng mờ dần + trượt nhẹ, trượt chỉ khi
 * không giảm chuyển động); thiết bị cảm ứng (`hover: none`) luôn thấy chúng, nên ẩn bằng `[@media(hover:hover)]` chứ không bằng `hover:` (xem docs/storefront-design.md mục 6).
 */
const FLOATING_BUTTON = [
  "pointer-events-auto bg-canvas/80 backdrop-blur-sm transition-[opacity,transform,color,background-color,border-color]",
  "focus-visible:ring-2 focus-visible:ring-ink focus-visible:outline-canvas",
  "[@media(hover:hover)]:opacity-0 [@media(hover:hover)]:motion-safe:translate-y-1",
  "[@media(hover:hover)]:group-hover/card:opacity-100 [@media(hover:hover)]:group-focus-within/card:opacity-100",
  "[@media(hover:hover)]:motion-safe:group-hover/card:translate-y-0 [@media(hover:hover)]:motion-safe:group-focus-within/card:translate-y-0",
].join(" ")

/**
 * Hai nút GIẢ trên ảnh thẻ (trái tim ở góc trên phải, "Thêm nhanh" ở đáy): chỉ hiện thông báo "sẽ sớm có mặt", không đổi trạng thái, không lưu, không thêm vào giỏ,
 * KHÔNG qua cổng đăng nhập (khi làm thật mới thêm). Lớp phủ dùng cùng tỉ lệ với khung ảnh (`PRODUCT_IMAGE_ASPECT`), `pointer-events-none` để chỉ hai nút bắt chuột;
 * nằm NGOÀI thẻ `<a>` nên bấm không điều hướng. Thẻ hẹp (< 16rem, đo bằng container query của thẻ): nút nhỏ lại và vùng bấm vẫn đủ 44px nhờ `before:`.
 * Hết hàng thì không có "Thêm nhanh".
 */
function QuickActions({ product }: { product: CatalogProductListItem }) {
  const toast = useToast()
  const notify = (title: string) => toast.add({ title, data: { tone: "info" } })

  return (
    <div className={cn("pointer-events-none absolute inset-x-0 top-0", PRODUCT_IMAGE_ASPECT)}>
      <Button
        type="button"
        variant="secondary"
        size="icon"
        aria-label={`Thêm ${product.name} vào yêu thích`}
        onClick={() => notify(STORE.comingSoon.wishlist)}
        className={cn(
          FLOATING_BUTTON,
          "absolute top-3 right-3 rounded-4xl @max-3xs:top-2 @max-3xs:right-2 @max-3xs:size-9 @max-3xs:before:absolute @max-3xs:before:-inset-1",
        )}
      >
        <Heart aria-hidden="true" />
      </Button>
      {product.inStock ? (
        <Button
          type="button"
          variant="secondary"
          aria-label={`Thêm nhanh ${product.name} vào giỏ hàng`}
          onClick={() => notify(STORE.comingSoon.quickAdd)}
          className={cn(
            FLOATING_BUTTON,
            "absolute inset-x-3 bottom-3 rounded-4xl text-overline uppercase @max-3xs:inset-x-2 @max-3xs:bottom-2 @max-3xs:h-9 @max-3xs:before:absolute @max-3xs:before:-inset-y-1",
          )}
        >
          <ShoppingBag aria-hidden="true" />
          Thêm nhanh
        </Button>
      ) : null}
    </div>
  )
}

export { QuickActions }
