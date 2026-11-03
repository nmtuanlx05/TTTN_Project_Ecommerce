import { Link } from "react-router-dom"
import { ProductImage } from "@/components/storefront/product-image"
import { formatVnd } from "@/lib/format"
import { usePrefetchCatalogProduct } from "../queries"
import type { CatalogProductListItem } from "../types"

/**
 * Thẻ sản phẩm: cả thẻ là MỘT liên kết tới trang chi tiết. Rê chuột hoặc focus vào thẻ thì tải trước chi tiết
 * (`prefetchQuery`), nên bấm vào là có dữ liệu ngay. Hết hàng ghi bằng CHỮ trên ảnh (không chỉ làm mờ). Không hiện SKU.
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
        <ProductImage src={product.imageUrl} alt={product.name} eager={eager} zoomOnHover />
        {product.inStock ? null : (
          <span className="absolute bottom-2 left-2 bg-canvas px-2 py-1 text-caption text-ink">Hết hàng</span>
        )}
      </div>
      <div className="flex flex-col gap-1">
        <span className="line-clamp-2 text-body-sm text-ink underline decoration-transparent decoration-1 underline-offset-4 transition-colors duration-(--motion-fast) ease-smooth group-hover/card:decoration-ink group-focus-visible/card:decoration-ink">
          {product.name}
        </span>
        <span className="text-body-sm text-ink-muted">{formatVnd(product.price)}</span>
      </div>
    </Link>
  )
}

export { ProductCard }
