/** Thông tin phân trang backend trả kèm danh sách (docs/api/users.md). */
export interface PaginationMeta {
  page: number
  limit: number
  total: number
  totalPages: number
}

/** Kết quả danh sách phân trang sau khi đã bóc khỏi `{ success, data, meta }`. */
export interface Paginated<T> {
  items: T[]
  meta: PaginationMeta
}

export type SortOrder = "asc" | "desc"
