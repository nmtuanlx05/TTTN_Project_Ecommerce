import { formatVnd } from "@/lib/format"
import type { CatalogSort } from "./types"

/** Mặc định và tối đa của backend cho GET /products công khai: 12 và 48. */
export const PAGE_SIZE = 12
/** Số thẻ trong khối "Sản phẩm cùng danh mục". */
export const RELATED_LIMIT = 8
/** Số thẻ đầu danh sách tải ảnh ngay (hàng đầu ở desktop); phần còn lại tải lười. */
export const EAGER_IMAGE_COUNT = 4

export const PRICE_MAX = 2147483647

/** Số lượng một lần thêm vào giỏ: 1–99. Giới hạn thật do server quyết ở bước giỏ hàng. */
export const QUANTITY_MIN = 1
export const QUANTITY_MAX = 99

export const SORT_OPTIONS: ReadonlyArray<{ value: CatalogSort; label: string }> = [
  { value: "newest", label: "Mới nhất" },
  { value: "price-asc", label: "Giá tăng dần" },
  { value: "price-desc", label: "Giá giảm dần" },
]

export const DEFAULT_SORT: CatalogSort = "newest"

/** Kiểu sắp xếp → query backend. `newest` không gửi gì vì đó là mặc định của backend (createdAt giảm dần). */
export const SORT_QUERY = {
  newest: {},
  "price-asc": { sortBy: "price", order: "asc" },
  "price-desc": { sortBy: "price", order: "desc" },
} as const

interface PriceRange {
  id: string
  label: string
  min?: number
  max?: number
}

/** Khoảng giá nhanh, nửa mở [min, mốc kế tiếp) nên một sản phẩm chỉ thuộc đúng một khoảng (backend so sánh `<=` nên `max` = mốc − 1). */
export const PRICE_RANGES: readonly PriceRange[] = [
  { id: "under-300", label: `Dưới ${formatVnd(300_000)}`, max: 299_999 },
  { id: "300-500", label: `${formatVnd(300_000)} – dưới ${formatVnd(500_000)}`, min: 300_000, max: 499_999 },
  { id: "500-1000", label: `${formatVnd(500_000)} – dưới ${formatVnd(1_000_000)}`, min: 500_000, max: 999_999 },
  { id: "over-1000", label: `Từ ${formatVnd(1_000_000)}`, min: 1_000_000 },
]

export type { PriceRange }
