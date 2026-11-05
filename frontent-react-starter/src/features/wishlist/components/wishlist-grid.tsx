import { useState } from "react"
import type { WishlistAddToCartSlot, WishlistItem } from "../types"
import { WishlistCard } from "./wishlist-card"

/**
 * Lưới hai cột. Giữ id của thẻ đang mở vùng chọn size: CHỈ MỘT thẻ mở tại một thời điểm (mở thẻ khác thì thẻ cũ thu lại). Thẻ bị bỏ khỏi yêu thích thì không còn trong `items`
 * nên `expanded` tự về false, không cần xử lý riêng.
 */
function WishlistGrid({
  items,
  isPending,
  onToggle,
  onNavigate,
  renderAddToCart,
}: {
  items: WishlistItem[]
  isPending: (productId: number) => boolean
  onToggle: (productId: number) => void
  onNavigate: () => void
  renderAddToCart: WishlistAddToCartSlot
}) {
  const [expandedId, setExpandedId] = useState<number | null>(null)

  return (
    <ul className="grid grid-cols-2 gap-x-4 gap-y-6 pb-6">
      {items.map((item) => (
        <WishlistCard
          key={item.id}
          item={item}
          expanded={expandedId === item.id}
          onExpandedChange={(next) => setExpandedId(next ? item.id : expandedId === item.id ? null : expandedId)}
          pending={isPending(item.id)}
          onToggle={() => onToggle(item.id)}
          onNavigate={onNavigate}
          renderAddToCart={renderAddToCart}
        />
      ))}
    </ul>
  )
}

export { WishlistGrid }
