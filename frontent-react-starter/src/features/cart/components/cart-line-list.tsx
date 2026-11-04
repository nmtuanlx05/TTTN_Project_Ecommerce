import { useRef } from "react"
import type { CartItem } from "../types"
import { CartLine } from "./cart-line"

/**
 * Danh sách dòng giỏ. Có dòng không mua được thì ghi một thông báo ngắn ở đầu. Xóa một dòng xong thì focus về danh sách
 * (dòng vừa mất không còn để giữ focus) và báo cho trình đọc màn hình qua `onAnnounce`.
 */
function CartLineList({
  items,
  unavailableCount,
  size,
  onAnnounce,
  className,
}: {
  items: CartItem[]
  unavailableCount: number
  size: "sm" | "lg"
  onAnnounce: (message: string) => void
  className?: string
}) {
  const listRef = useRef<HTMLUListElement>(null)

  return (
    <div className={className}>
      {unavailableCount > 0 ? (
        <p className="mb-2 rounded-xs bg-surface-sunken px-3 py-2 text-caption text-ink">
          {unavailableCount} sản phẩm không còn bán hoặc đã hết hàng, hãy xóa khỏi giỏ. Các sản phẩm này không tính vào tạm tính.
        </p>
      ) : null}
      <ul ref={listRef} tabIndex={-1} aria-label="Sản phẩm trong giỏ hàng" className="outline-none">
        {items.map((item) => (
          <CartLine
            key={item.id}
            item={item}
            size={size}
            onRemoved={(name) => {
              onAnnounce(`Đã xóa ${name} khỏi giỏ hàng`)
              listRef.current?.focus()
            }}
          />
        ))}
      </ul>
    </div>
  )
}

export { CartLineList }
