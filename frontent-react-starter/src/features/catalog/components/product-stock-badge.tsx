import { cn } from "@/lib/utils"

const BADGE =
  "absolute top-3 left-3 inline-flex items-center gap-2 border border-border-default bg-canvas/80 px-2 py-1 text-overline whitespace-nowrap text-ink uppercase backdrop-blur-sm"

/**
 * Huy hiệu tồn kho ở góc trên trái ảnh thẻ sản phẩm: nền kính mờ (token kèm độ trong suốt) nên đọc được trên ảnh sáng lẫn tối.
 * Chỉ hiện MỘT huy hiệu: "Hết hàng" ưu tiên hơn "Sắp hết" (kèm chấm màu cảnh báo). Còn hàng bình thường thì không hiện gì.
 * Truyền đạt bằng chữ, chấm chỉ là điểm nhấn nên `aria-hidden`. Phải đặt trong phần tử cha có `relative`.
 */
function ProductStockBadge({ inStock, lowStock, className }: { inStock: boolean; lowStock: boolean; className?: string }) {
  if (!inStock) return <span className={cn(BADGE, className)}>Hết hàng</span>
  if (!lowStock) return null

  return (
    <span className={cn(BADGE, className)}>
      <span aria-hidden="true" className="size-2 rounded-4xl bg-warning-fg" />
      Sắp hết
    </span>
  )
}

export { ProductStockBadge }
