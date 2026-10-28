import { cn } from "@/lib/utils"
import type { ProductListItem } from "../types"

/** Tên sản phẩm kèm slug nhỏ bên dưới; sản phẩm đang ẩn thì tên nhạt đi. */
function ProductNameCell({ product }: { product: ProductListItem }) {
  return (
    <div className="flex min-w-0 flex-col">
      <span className={cn("font-medium", product.isActive ? "text-ink" : "text-ink-muted")}>
        {product.name}
      </span>
      <span className="font-mono text-caption whitespace-nowrap text-ink-muted">{product.slug}</span>
    </div>
  )
}

export { ProductNameCell }
