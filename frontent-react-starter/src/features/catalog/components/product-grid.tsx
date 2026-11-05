import { cn } from "@/lib/utils"
import { EAGER_IMAGE_COUNT } from "../constants"
import type { CatalogProductListItem } from "../types"
import { ProductCard } from "./product-card"

/** Số cột: 2 (di động), 3 (từ 768px). `beside-filters`: có cột lọc bên trái nên chỉ 4 cột từ `xl`; `full`: 4 cột từ `lg`; `four-up`: đúng 4 sản phẩm của trang chủ, 4 cột từ `md`. */
const GRID_CLASS = {
  "beside-filters": "grid-cols-2 md:grid-cols-3 xl:grid-cols-4",
  full: "grid-cols-2 md:grid-cols-3 lg:grid-cols-4",
  "four-up": "grid-cols-2 md:grid-cols-4",
} as const

type GridLayout = keyof typeof GRID_CLASS

const GRID_BASE = "grid gap-x-4 gap-y-10 md:gap-x-6 lg:gap-y-12"

function ProductGrid({
  products,
  layout,
  eagerCount = EAGER_IMAGE_COUNT,
  quickActions = false,
  className,
}: {
  products: CatalogProductListItem[]
  layout: GridLayout
  /** Số thẻ đầu tải ảnh ngay; lưới nằm dưới màn hình đầu (sản phẩm cùng danh mục) truyền 0. */
  eagerCount?: number
  /** Bật nút trái tim yêu thích và "Thêm nhanh" trên thẻ; chỉ các khối trang chủ bật, xem `ProductCard`. */
  quickActions?: boolean
  className?: string
}) {
  return (
    <ul className={cn(GRID_BASE, GRID_CLASS[layout], className)}>
      {products.map((product, index) => (
        <li key={product.id}>
          <ProductCard product={product} eager={index < eagerCount} quickActions={quickActions} />
        </li>
      ))}
    </ul>
  )
}

export { ProductGrid, GRID_BASE, GRID_CLASS }
export type { GridLayout }
