import { formatVnd } from "@/lib/format"
import type { CatalogSort } from "./types"

/** Mặc định và tối đa của backend cho GET /products công khai: 12 và 48. */
export const PAGE_SIZE = 12
/** Số thẻ trong khối "Có thể bạn cũng thích". */
export const RELATED_LIMIT = 4
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

/**
 * TẠM: tên màu → mã màu của chấm chọn màu. Backend CHƯA có mã màu nên frontend tự ánh xạ theo tên màu trong seed. Đây là DỮ LIỆU SẢN PHẨM, không phải
 * token giao diện (ngoại lệ có chủ đích của quy tắc "không viết cứng mã màu", docs/storefront-design.md mục 2 và 13); sẽ thay bằng mã màu từ backend ở bước ảnh và màu.
 * Tên chưa có trong bảng thì ô màu rơi về nút chữ. `light`: màu sáng/trắng, chấm cần viền mảnh để thấy rõ trên nền be.
 */
const SWATCH_COLORS: Record<string, { hex: string; light?: boolean }> = {
  trắng: { hex: "#ffffff", light: true },
  đen: { hex: "#1a1a1a" },
  xám: { hex: "#9a9a9a" },
  "xanh navy": { hex: "#1f2a44" },
  xanh: { hex: "#4a78b5" },
  hồng: { hex: "#e8b4bc", light: true },
  be: { hex: "#cdb79e", light: true },
  "xanh rêu": { hex: "#6b7a55" },
  "xanh đậm": { hex: "#1f4e79" },
  "xanh nhạt": { hex: "#a9c4de", light: true },
}

/** Tra mã màu theo tên (không phân biệt hoa thường, bỏ khoảng trắng thừa); không có thì `undefined`. */
export function findSwatch(name: string) {
  return SWATCH_COLORS[name.trim().replace(/\s+/g, " ").toLowerCase()]
}
