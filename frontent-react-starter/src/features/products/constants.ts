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
export const IMAGE_URL_MAX_LENGTH = 191
export const PRICE_MAX = 2147483647
export const SKU_MAX_LENGTH = 64
export const SIZE_MAX_LENGTH = 50
export const COLOR_MAX_LENGTH = 50
export const MAX_VARIANTS = 100

/** Slug: chữ thường không dấu, số, ngăn cách bằng một dấu gạch ngang. */
export const SLUG_REGEX = /^[a-z0-9]+(-[a-z0-9]+)*$/

/** SKU: backend tự đổi sang chữ in hoa nên form nhận cả chữ thường. */
export const SKU_REGEX = /^[A-Za-z0-9._-]+$/

export const IMAGE_URL_REGEX = /^https?:\/\/\S+$/i

export const VISIBILITY_LABEL = { visible: "Đang hiện", hidden: "Đang ẩn" } as const
