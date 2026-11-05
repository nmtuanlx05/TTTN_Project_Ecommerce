import { Link } from "react-router-dom"
import { useState } from "react"
import { ProductImage } from "@/components/storefront/product-image"
import { ProductHoverImage } from "@/components/storefront/product-hover-image"
import { formatVnd } from "@/lib/format"
import { cn } from "@/lib/utils"
import { usePrefetchCatalogProduct } from "../queries"
import type { CatalogProductListItem } from "../types"
import { ProductCardColors } from "./product-card-colors"
import { QuickActions } from "./product-card-quick-actions"
import { ProductStockBadge } from "./product-stock-badge"

/**
 * Thẻ sản phẩm: cả thẻ là MỘT liên kết tới trang chi tiết. Rê chuột hoặc focus vào thẻ thì tải trước chi tiết
 * (`prefetchQuery`), nên bấm vào là có dữ liệu ngay. Tồn kho ghi bằng CHỮ ở huy hiệu góc ảnh ("Hết hàng" hoặc "Sắp hết"); hết hàng thì
 * ảnh mờ đi và tên chuyển sang `ink-muted` (chỉ làm dịu, không dựa vào màu; chữ vẫn ≥ 4,5:1). Không hiện SKU.
 * `eager`: ảnh ở hàng đầu tiên tải ngay, còn lại lazy.
 *
 * `quickActions` (mặc định TẮT; chỉ "Best sellers" và "Sản phẩm mới về" ở trang chủ bật): thêm nút trái tim và "Thêm nhanh" (trái tim yêu thích thật + "Thêm nhanh", xem `QuickActions`). Khi bật, thẻ
 * `<a>` được bọc trong `div.group/card` để hover/focus vào BẤT KỲ chỗ nào của thẻ (kể cả hai nút) vừa hiện nút vừa phóng ảnh, chuột đi từ ảnh sang nút không bị thu rồi phóng lại; thẻ
 * `<a>` khi đó không tự làm `group/card`. Thẻ hẹp thì huy hiệu tồn kho dời xuống dưới hàng nút trái tim. Khi tắt, cây DOM giữ nguyên như cũ.
 *
 * Ảnh thứ hai (`secondImageUrl`): vùng `group/card` (vùng bọc ngoài) bật `armed` ở lần rê chuột/focus đầu tiên, CHỈ trên thiết bị có hover (`matchMedia`), rồi mới dựng
 * `ProductHoverImage` (bắt đầu tải lúc đó, nên lưới không tải ảnh thừa). Có ảnh thứ hai thì crossfade thay cho hiệu ứng phóng; không có thì giữ phóng 1,03.
 * Chấm màu (`ProductCardColors`) nằm bên phải giá.
 */
function ProductCard({
  product,
  eager = false,
  quickActions = false,
}: {
  product: CatalogProductListItem
  eager?: boolean
  quickActions?: boolean
}) {
  const prefetch = usePrefetchCatalogProduct()
  const warm = () => prefetch(product.slug)
  const [armed, setArmed] = useState(false)
  const second = product.secondImageUrl
  const arm = () => {
    if (second && !armed && window.matchMedia("(hover: hover)").matches) setArmed(true)
  }
  const armProps = { onMouseEnter: arm, onFocus: arm }
  // Có quickActions thì vùng bọc ngoài lo việc `arm`; không thì chính thẻ `<a>` là vùng `group/card`.
  const onEnter = () => {
    warm()
    if (!quickActions) arm()
  }

  const link = (
    <Link
      to={`/products/${encodeURIComponent(product.slug)}`}
      onMouseEnter={onEnter}
      onFocus={onEnter}
      className={cn(!quickActions && "group/card", "flex flex-col gap-3")}
    >
      <div className="relative">
        <ProductImage
          src={product.imageUrl}
          alt={product.name}
          eager={eager}
          zoomOnHover={!second}
          overlay={armed && second ? <ProductHoverImage src={second} /> : undefined}
          className={product.inStock ? undefined : "opacity-60"}
        />
        <ProductStockBadge
          inStock={product.inStock}
          lowStock={product.lowStock}
          className={quickActions ? "@max-3xs:top-13" : undefined}
        />
      </div>
      <div className="flex flex-col gap-1">
        <span
          className={cn(
            "line-clamp-2 text-body-sm underline decoration-transparent decoration-1 underline-offset-4 transition-colors duration-(--motion-fast) ease-smooth group-hover/card:decoration-ink group-focus-visible/card:decoration-ink",
            quickActions && "group-has-[a:focus-visible]/card:decoration-ink",
            product.inStock ? "text-ink" : "text-ink-muted",
          )}
        >
          {product.name}
        </span>
        <div className="flex items-center justify-between gap-2">
          <span className="shrink-0 text-body-sm text-ink-muted">{formatVnd(product.price)}</span>
          <ProductCardColors colors={product.colors} />
        </div>
      </div>
    </Link>
  )

  if (!quickActions) return link

  return (
    <div className="group/card @container relative" {...armProps}>
      {link}
      <QuickActions product={product} />
    </div>
  )
}

export { ProductCard }
