import type { ProductSortBy } from "./types"

export const PAGE_SIZE = 10

/** Backend (GET /admin/products) cho sắp theo `createdAt`, `price` hoặc `name`. */
export const SORT_FIELDS: readonly ProductSortBy[] = ["createdAt", "price", "name"]

/** Mặc định của backend: mới tạo trước. Giá trị mặc định không ghi lên URL. */
export const DEFAULT_SORT = { sortBy: "createdAt", order: "desc" } as const

/** Giới hạn của backend (CreateProductDto, CreateVariantDto). */
export const NAME_MAX_LENGTH = 191
export const SLUG_MAX_LENGTH = 191
export const DESCRIPTION_MAX_LENGTH = 10000
export const IMAGE_URL_MAX_LENGTH = 500
export const MAX_PRODUCT_IMAGES = 6
export const PRICE_MAX = 2147483647
export const SKU_MAX_LENGTH = 64
export const SIZE_MAX_LENGTH = 50
export const COLOR_MAX_LENGTH = 50
export const MAX_VARIANTS = 100

/** Slug: chữ thường không dấu, số, ngăn cách bằng một dấu gạch ngang. */
export const SLUG_REGEX = /^[a-z0-9]+(-[a-z0-9]+)*$/

/** SKU: backend tự đổi sang chữ in hoa nên form nhận cả chữ thường. */
export const SKU_REGEX = /^[A-Za-z0-9._-]+$/

/** Mã màu `#RRGGBB`, không phân biệt hoa thường (backend chuẩn hóa in hoa). */
export const COLOR_HEX_REGEX = /^#[0-9a-f]{6}$/i

/** Ảnh đã lưu: http hoặc https (ảnh cũ có thể là http://localhost/uploads/...). */
export const IMAGE_URL_REGEX = /^https?:\/\/\S+$/i

/** Ảnh MỚI dán bằng URL: chỉ https (backend từ chối URL ngoài không https). */
export const NEW_IMAGE_URL_REGEX = /^https:\/\/\S+$/i

export const VISIBILITY_LABEL = {
  visible: "Đang hiện",
  hidden: "Đang ẩn",
} as const
