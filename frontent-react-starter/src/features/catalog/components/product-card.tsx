import { Link } from "react-router-dom"
import { ProductImage } from "@/components/storefront/product-image"
import { formatVnd } from "@/lib/format"
import { cn } from "@/lib/utils"
import { usePrefetchCatalogProduct } from "../queries"
import type { CatalogProductListItem } from "../types"
import { ProductStockBadge } from "./product-stock-badge"

/**
 * Thẻ sản phẩm: cả thẻ là MỘT liên kết tới trang chi tiết. Rê chuột hoặc focus vào thẻ thì tải trước chi tiết
 * (`prefetchQuery`), nên bấm vào là có dữ liệu ngay. Tồn kho ghi bằng CHỮ ở huy hiệu góc ảnh ("Hết hàng" hoặc "Sắp hết"); hết hàng thì
 * ảnh mờ đi và tên chuyển sang `ink-muted` (chỉ làm dịu, không dựa vào màu; chữ vẫn ≥ 4,5:1). Không hiện SKU.
 * `eager`: ảnh ở hàng đầu tiên tải ngay, còn lại lazy.
 */
function ProductCard({ product, eager = false }: { product: CatalogProductListItem; eager?: boolean }) {
  const prefetch = usePrefetchCatalogProduct()
  const warm = () => prefetch(product.slug)

  return (
    <Link
      to={`/products/${encodeURIComponent(product.slug)}`}
      onMouseEnter={warm}
      onFocus={warm}
      className="group/card flex flex-col gap-3"
    >
      <div className="relative">
        <ProductImage
          src={product.imageUrl}
          alt={product.name}
          eager={eager}
          zoomOnHover
          className={product.inStock ? undefined : "opacity-60"}
        />
        <ProductStockBadge inStock={product.inStock} lowStock={product.lowStock} />
      </div>
      <div className="flex flex-col gap-1">
        <span
          className={cn(
            "line-clamp-2 text-body-sm underline decoration-transparent decoration-1 underline-offset-4 transition-colors duration-(--motion-fast) ease-smooth group-hover/card:decoration-ink group-focus-visible/card:decoration-ink",
            product.inStock ? "text-ink" : "text-ink-muted",
          )}
        >
          {product.name}
        </span>
        <span className="text-body-sm text-ink-muted">{formatVnd(product.price)}</span>
      </div>
    </Link>
  )
}

export { ProductCard }
