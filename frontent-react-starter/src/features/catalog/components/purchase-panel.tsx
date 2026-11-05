import { useState } from "react"
import { createPortal } from "react-dom"
import { ShoppingBag } from "lucide-react"
import { FavoriteButton } from "@/components/storefront/favorite-button"
import { useWishlistUi } from "@/components/storefront/wishlist-ui-context"
import { QuantityStepper } from "@/components/storefront/quantity-stepper"
import { Button } from "@/components/ui/button"
import { ABOVE_ONLY_MARGIN, useInView } from "@/hooks/use-in-view"
import { MAX_QUANTITY_PER_ITEM } from "@/lib/cart-rules"
import type { CatalogProductDetail } from "../types"
import { defaultChoice, findVariant, type VariantChoice } from "../variant-options"
import { StickyBuyBar } from "./sticky-buy-bar"
import { VariantPicker } from "./variant-picker"

type AddToCartInput = { variantId: number; quantity: number }

/**
 * Chọn màu/size, số lượng, nút "Thêm vào giỏ" (ghi "Hết hàng" và khóa khi tổ hợp đang chọn hết hàng) và nút tim yêu thích (thật, qua `useWishlistUi`). Mặc định chọn biến thể còn
 * hàng đầu tiên. Dựng với `key={product.id}` ở nơi dùng nên đổi sản phẩm là đặt lại lựa chọn. `onAddToCart` do trang truyền
 * vào (qua cổng đăng nhập); panel không biết giỏ hàng. `pending`: đang gửi yêu cầu thêm, khóa hai nút thêm. Số lượng chặn sớm ở `MAX_QUANTITY_PER_ITEM`. Thanh mua dính đáy (di động) hiện khi nút chính đã cuộn lên khỏi
 * màn hình; nó được portal vào `barSlot` (ô dính ở cuối trang) nhưng state vẫn thuộc panel này.
 */
function PurchasePanel({
  product,
  barSlot,
  onAddToCart,
  pending = false,
}: {
  product: CatalogProductDetail
  barSlot: HTMLElement | null
  onAddToCart: (input: AddToCartInput) => void
  pending?: boolean
}) {
  const { variants } = product
  const [choice, setChoice] = useState<VariantChoice | null>(() => defaultChoice(variants))
  const [quantity, setQuantity] = useState(1)
  const wishlist = useWishlistUi()
  const { ref: buttonRef, above } = useInView<HTMLDivElement>({ rootMargin: ABOVE_ONLY_MARGIN })

  const variant = choice ? findVariant(variants, choice) : undefined
  const available = Boolean(variant?.inStock)
  const add = () => {
    if (variant && variant.inStock) onAddToCart({ variantId: variant.id, quantity })
  }

  if (!choice) return null

  return (
    <div className="@container flex flex-col gap-6">
      <VariantPicker variants={variants} choice={choice} onChange={setChoice} />

      {/* Trạng thái của tổ hợp đang chọn: chỉ cho trình đọc màn hình (nút bên dưới cũng ghi "Hết hàng" bằng chữ nhìn thấy được). */}
      <p aria-live="polite" className="sr-only">
        {available ? "Còn hàng" : "Hết hàng"}
      </p>

      {/* Thẻ rộng từ 24rem: một hàng (số lượng, nút, tim); hẹp hơn: số lượng + tim ở hàng trên, nút full-width ở hàng dưới. */}
      <div ref={buttonRef} className="flex flex-wrap items-center gap-3">
        <div className="order-1">
          <QuantityStepper pill max={MAX_QUANTITY_PER_ITEM} value={quantity} onChange={setQuantity} />
        </div>
        <FavoriteButton
          name={product.name}
          favorite={wishlist.isFavorite(product.id)}
          pending={wishlist.isPending(product.id)}
          onToggle={() => wishlist.toggle(product.id)}
          className="order-2 ml-auto size-[calc(var(--sp-control-h)+6px)] @[24rem]:order-3 @[24rem]:ml-0"
        />
        <Button
          size="lg"
          disabled={!available}
          loading={pending}
          onClick={add}
          className="press order-3 w-full rounded-4xl @[24rem]:order-2 @[24rem]:w-auto @[24rem]:flex-1"
        >
          {available ? <ShoppingBag aria-hidden="true" /> : null}
          {available ? "Thêm vào giỏ" : "Hết hàng"}
        </Button>
      </div>

      {barSlot
        ? createPortal(
            <StickyBuyBar
              visible={above}
              price={product.price}
              variantLabel={`${choice.color} · ${choice.size}`}
              soldOut={!available}
              pending={pending}
              onAdd={add}
            />,
            barSlot,
          )
        : null}
    </div>
  )
}

export { PurchasePanel }
export type { AddToCartInput }
