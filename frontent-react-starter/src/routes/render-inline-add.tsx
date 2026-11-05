import { InlineAddToCart } from "@/features/catalog/components/inline-add-to-cart"
import type { WishlistAddToCartSlot } from "@/features/wishlist/types"

/** Slot "Thêm vào giỏ hàng" của ngăn kéo yêu thích: ghép `InlineAddToCart` (features/catalog) vào thẻ của features/wishlist, vì hai feature không import lẫn nhau. */
export const renderInlineAddToCart: WishlistAddToCartSlot = ({ item, expanded, onExpandedChange }) => (
  <InlineAddToCart slug={item.slug} expanded={expanded} onExpandedChange={onExpandedChange} />
)
