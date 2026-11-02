import { useState } from "react"
import { createPortal } from "react-dom"
import { Check, X } from "lucide-react"
import { Button } from "@/components/ui/button"
import { ABOVE_ONLY_MARGIN, useInView } from "@/hooks/use-in-view"
import type { CatalogProductDetail } from "../types"
import { defaultChoice, findVariant, type VariantChoice } from "../variant-options"
import { QuantityStepper } from "./quantity-stepper"
import { StickyBuyBar } from "./sticky-buy-bar"
import { VariantPicker } from "./variant-picker"

type AddToCartInput = { variantId: number; quantity: number }

/**
 * Chọn màu/size, số lượng, trạng thái còn/hết hàng của biến thể đang chọn và nút "Thêm vào giỏ". Mặc định chọn biến thể còn
 * hàng đầu tiên. Dựng với `key={product.id}` ở nơi dùng nên đổi sản phẩm là đặt lại lựa chọn. `onAddToCart` do trang truyền
 * vào (qua cổng đăng nhập); panel không biết giỏ hàng. Thanh mua dính đáy (di động) hiện khi nút chính đã cuộn lên khỏi
 * màn hình; nó được portal vào `barSlot` (ô dính ở cuối trang) nhưng state vẫn thuộc panel này.
 */
function PurchasePanel({
  product,
  barSlot,
  onAddToCart,
}: {
  product: CatalogProductDetail
  barSlot: HTMLElement | null
  onAddToCart: (input: AddToCartInput) => void
}) {
  const { variants } = product
  const [choice, setChoice] = useState<VariantChoice | null>(() => defaultChoice(variants))
  const [quantity, setQuantity] = useState(1)
  const { ref: buttonRef, above } = useInView<HTMLDivElement>({ rootMargin: ABOVE_ONLY_MARGIN })

  const variant = choice ? findVariant(variants, choice) : undefined
  const available = Boolean(variant?.inStock)
  const add = () => {
    if (variant && variant.inStock) onAddToCart({ variantId: variant.id, quantity })
  }

  if (!choice) return null

  return (
    <div className="flex flex-col gap-6">
      <VariantPicker variants={variants} choice={choice} onChange={setChoice} />

      <div className="flex flex-wrap items-center justify-between gap-inline">
        <QuantityStepper value={quantity} onChange={setQuantity} />
        <p aria-live="polite" className="flex items-center gap-2 text-body-sm text-ink">
          {available ? <Check className="size-4" aria-hidden="true" /> : <X className="size-4" aria-hidden="true" />}
          {available ? "Còn hàng" : "Hết hàng"}
        </p>
      </div>

      <div ref={buttonRef}>
        <Button size="lg" disabled={!available} onClick={add} className="press w-full">
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
