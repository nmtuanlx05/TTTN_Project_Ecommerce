import { Trash2 } from "lucide-react"
import { Link } from "react-router-dom"
import { ProductImage } from "@/components/storefront/product-image"
import { QuantityStepper } from "@/components/storefront/quantity-stepper"
import { Button } from "@/components/ui/button"
import { formatVnd } from "@/lib/format"
import { cn } from "@/lib/utils"
import { useRemoveCartItem, useUpdateCartItem } from "../queries"
import type { CartItem } from "../types"

/**
 * Một dòng giỏ, dùng chung cho ngăn kéo (`size="sm"`) và trang /gio-hang (`size="lg"`, rộng hơn). Mỗi dòng có mutation riêng nên chỉ dòng đang gửi bị khóa.
 * Dòng không mua được (`purchasable` sai hoặc hết hàng): ảnh mờ, nhãn bằng chữ, không có ô số lượng, chỉ xóa được. Chữ giữ màu `ink-muted` (không giảm độ mờ cả dòng) để vẫn đủ tương phản.
 * Dòng có `quantity > maxQuantity` (tồn giảm sau khi thêm) cảnh báo "Chỉ còn N"; nút "−" đưa số lượng về mức tối đa.
 */
function CartLine({
  item,
  size,
  onRemoved,
}: {
  item: CartItem
  size: "sm" | "lg"
  /** Xóa xong: nơi dùng đặt lại focus và thông báo cho trình đọc màn hình. */
  onRemoved: (name: string) => void
}) {
  const update = useUpdateCartItem()
  const remove = useRemoveCartItem()
  const busy = update.isPending || remove.isPending
  const sellable = item.purchasable && item.inStock
  const large = size === "lg"

  return (
    <li className={cn("flex gap-4 border-b border-border-subtle py-[18px] last:border-b-0", large && "gap-5 py-6")}>
      <ProductImage
        src={item.imageUrl}
        alt=""
        className={cn("w-20 shrink-0 self-start", large && "w-28 sm:w-32", !sellable && "opacity-60")}
      />
      <div className="flex min-w-0 flex-1 flex-col gap-1">
        <div className="flex items-start justify-between gap-3">
          <Link
            to={`/products/${encodeURIComponent(item.slug)}`}
            className={cn("line-clamp-2 font-medium text-ink hover:underline", large ? "text-body" : "text-body-sm")}
          >
            {item.name}
          </Link>
          <span className={cn("shrink-0 font-semibold", sellable ? "text-ink" : "text-ink-muted", large ? "text-body" : "text-body-sm")}>
            {formatVnd(item.lineTotal)}
          </span>
        </div>
        <p className="text-caption text-ink-muted">
          {item.color} · {item.size}
        </p>
        <p className="text-caption text-ink-muted">{formatVnd(item.unitPrice)}</p>
        {!sellable ? (
          <p className="text-caption font-semibold text-ink">{item.purchasable ? "Hết hàng" : "Không còn bán"}</p>
        ) : item.quantity > item.maxQuantity ? (
          <p className="text-caption font-semibold text-warning-fg">Chỉ còn {item.maxQuantity}</p>
        ) : null}
        <div className="mt-2 flex items-center justify-between gap-2">
          {sellable ? (
            <QuantityStepper
              compact
              value={item.quantity}
              max={item.maxQuantity}
              disabled={busy}
              onChange={(quantity) => update.mutate({ id: item.id, quantity })}
            />
          ) : (
            <span />
          )}
          <Button
            type="button"
            variant="ghost"
            aria-label={`Xóa ${item.name} khỏi giỏ hàng`}
            disabled={busy}
            onClick={() => remove.mutate(item.id, { onSuccess: () => onRemoved(item.name) })}
            className="press -mr-2 text-ink-muted"
          >
            <Trash2 aria-hidden="true" />
            Xóa
          </Button>
        </div>
      </div>
    </li>
  )
}

export { CartLine }
