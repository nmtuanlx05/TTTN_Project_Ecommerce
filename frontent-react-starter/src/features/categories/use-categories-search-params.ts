import { useSearchParams } from "react-router-dom"
import type { SortOrder } from "@/types/api"
import type { CategoryListParams, CategorySortBy } from "./types"
import { DEFAULT_SORT, PAGE_SIZE, SORT_FIELDS } from "./constants"

type UpdateOptions = {
  /** Đổi bộ lọc/sắp xếp thì về trang 1. Chỉ đổi trang mới đặt false. */
  resetPage?: boolean
  /** Ghi đè dòng lịch sử thay vì thêm mới (dùng khi gõ tìm kiếm). */
  replace?: boolean
}

/**
 * Toàn bộ trạng thái bảng danh mục nằm trên URL (`?q=&sortBy=&order=&page=`) để F5 hoặc gửi
 * link không mất. Giá trị trên URL không đáng tin: backend dùng `forbidNonWhitelisted` và chỉ
 * nhận `sortBy` là id/name, nên mọi giá trị đều được lọc theo whitelist trước khi gửi đi.
 */
export function useCategoriesSearchParams() {
  const [searchParams, setSearchParams] = useSearchParams()

  const q = (searchParams.get("q") ?? "").trim()

  const sortParam = searchParams.get("sortBy")
  const sortBy = SORT_FIELDS.find((item) => item === sortParam) ?? DEFAULT_SORT.sortBy
  const orderParam = searchParams.get("order")
  const order: SortOrder =
    orderParam === "asc" || orderParam === "desc" ? orderParam : DEFAULT_SORT.order

  const pageParam = Number(searchParams.get("page"))
  const page = Number.isInteger(pageParam) && pageParam >= 1 ? pageParam : 1

  const params: CategoryListParams = { q: q || undefined, sortBy, order, page, limit: PAGE_SIZE }

  const hasFilters = Boolean(q)

  function update(
    patch: Record<string, string | undefined>,
    { resetPage = true, replace = false }: UpdateOptions = {},
  ) {
    setSearchParams(
      (previous) => {
        const next = new URLSearchParams(previous)
        for (const [key, value] of Object.entries(patch)) {
          if (value === undefined || value === "") next.delete(key)
          else next.set(key, value)
        }
        if (resetPage) next.delete("page")
        return next
      },
      { replace },
    )
  }

  return {
    params,
    q,
    sortBy,
    order,
    page,
    hasFilters,

    setQuery: (value: string) => update({ q: value.trim() }, { replace: true }),
    setPage: (value: number, replace = false) =>
      update({ page: value > 1 ? String(value) : undefined }, { resetPage: false, replace }),

    /** Bấm tiêu đề cột: A → Z, rồi Z → A, rồi về thứ tự mặc định (mới tạo trước). */
    toggleSort: (column: CategorySortBy) => {
      if (column === DEFAULT_SORT.sortBy) return
      if (column !== sortBy) update({ sortBy: column, order: "asc" })
      else if (order === "asc") update({ sortBy: column, order: "desc" })
      else update({ sortBy: undefined, order: undefined })
    },

    clearFilters: () => update({ q: undefined }),
  }
}

export type CategoriesSearch = ReturnType<typeof useCategoriesSearchParams>
