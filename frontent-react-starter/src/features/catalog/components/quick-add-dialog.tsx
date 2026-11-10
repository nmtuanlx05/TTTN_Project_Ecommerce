import { useState } from "react"
import { ShoppingBag } from "lucide-react"
import { ProductImage } from "@/components/storefront/product-image"
import { QuantityStepper } from "@/components/storefront/quantity-stepper"
import { StorefrontDialog } from "@/components/storefront/storefront-dialog"
import { Button } from "@/components/ui/button"
import { MAX_QUANTITY_PER_ITEM } from "@/lib/cart-rules"
import { formatVnd } from "@/lib/format"
import type { CatalogProductDetail } from "../types"
import { defaultChoice, findVariant, type VariantChoice } from "../variant-options"
import type { AddToCartInput } from "./purchase-panel"
import { VariantPicker } from "./variant-picker"

/** Phần trong hộp thoại: chọn sẵn biến thể còn hàng đầu tiên (`defaultChoice`, cùng logic trang chi tiết). Dựng khi mở nên mỗi lần mở là đặt lại lựa chọn. */
function QuickAddForm({
  product,
  pending,
  onAdd,
}: {
  product: CatalogProductDetail
  pending: boolean
  onAdd: (input: AddToCartInput) => void
}) {
  const [choice, setChoice] = useState<VariantChoice | null>(() => defaultChoice(product.variants))
  const [quantity, setQuantity] = useState(1)
  const variant = choice ? findVariant(product.variants, choice) : undefined
  if (!choice) return null

  return (
    <div className="flex flex-col gap-5 p-gutter">
      <div className="flex items-center gap-4">
        <ProductImage src={product.imageUrl} alt="" preset="tiny" className="w-16 shrink-0" />
        <p className="text-body-sm font-semibold text-ink">{formatVnd(product.price)}</p>
      </div>
      <VariantPicker inStockOnly variants={product.variants} choice={choice} onChange={setChoice} />
      <div className="flex flex-wrap items-center gap-3">
        <QuantityStepper pill max={MAX_QUANTITY_PER_ITEM} value={quantity} onChange={setQuantity} disabled={pending} />
        <Button
          size="lg"
          disabled={!variant?.inStock}
          loading={pending}
          onClick={() => variant && onAdd({ variantId: variant.id, quantity })}
          className="press min-w-40 flex-1 rounded-4xl"
        >
          <ShoppingBag aria-hidden="true" />
          Thêm vào giỏ
        </Button>
      </div>
    </div>
  )
}

/**
 * Hộp thoại "Chọn phân loại" của "Thêm nhanh" (sản phẩm từ hai biến thể trở lên): `VariantPicker` (biến thể hết hàng mờ và không chọn được) + số lượng + "Thêm vào giỏ".
 * Thành công thì nơi dùng đóng hộp thoại và mở ngăn kéo giỏ.
 */
function QuickAddDialog({
  product,
  open,
  onOpenChange,
  pending,
  onAdd,
  onOpenChangeComplete,
  finalFocus,
}: {
  product: CatalogProductDetail
  open: boolean
  onOpenChange: (open: boolean) => void
  pending: boolean
  onAdd: (input: AddToCartInput) => void
  onOpenChangeComplete: (open: boolean) => void
  finalFocus: React.ComponentProps<typeof StorefrontDialog>["finalFocus"]
}) {
  return (
    <StorefrontDialog open={open} onOpenChange={onOpenChange} title="Chọn phân loại" description={product.name} finalFocus={finalFocus} onOpenChangeComplete={onOpenChangeComplete}>
      <QuickAddForm product={product} pending={pending} onAdd={onAdd} />
    </StorefrontDialog>
  )
}

export { QuickAddDialog }
