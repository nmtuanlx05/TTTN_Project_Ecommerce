import type { CategorySortBy } from "./types"

export const PAGE_SIZE = 10

/** Backend cho sắp theo `id` hoặc `name`; bảng chỉ có cột Tên bấm được, `id` là mặc định. */
export const SORT_FIELDS: readonly CategorySortBy[] = ["id", "name"]

/** Mặc định của backend: mới tạo trước (chưa có createdAt). Giá trị mặc định không ghi lên URL. */
export const DEFAULT_SORT = { sortBy: "id", order: "desc" } as const

/** Giới hạn độ dài tên và slug của backend (CreateCategoryDto). */
export const NAME_MAX_LENGTH = 191
export const SLUG_MAX_LENGTH = 191

/** Slug: chữ thường không dấu, số, ngăn cách bằng một dấu gạch ngang (backend `SLUG_REGEX`). */
export const SLUG_REGEX = /^[a-z0-9]+(-[a-z0-9]+)*$/
