import { useSearchParams } from "react-router-dom"
import type { SortOrder } from "@/types/api"
import { DEFAULT_SORT, PAGE_SIZE, SORT_FIELDS } from "./constants"
import type { ProductListParams, ProductSortBy } from "./types"

type UpdateOptions = {
  /** Đổi bộ lọc/sắp xếp thì về trang 1. Chỉ đổi trang mới đặt false. */
  resetPage?: boolean
  /** Ghi đè dòng lịch sử thay vì thêm mới (dùng khi gõ tìm kiếm). */
  replace?: boolean
}

/** Giá trị đầu tiên khi bấm một cột: ngày tạo mới nhất trước, còn lại thấp → cao / A → Z. */
function firstOrder(sortBy: ProductSortBy): SortOrder {
  return sortBy === "createdAt" ? "desc" : "asc"
}

/**
 * Toàn bộ trạng thái bảng sản phẩm nằm trên URL (`?q=&categoryId=&isActive=&sortBy=&order=&page=`) để
 * F5, Back hoặc gửi link không mất. Giá trị trên URL không đáng tin: backend dùng
 * `forbidNonWhitelisted` và chỉ nhận `sortBy` là createdAt/price/name, nên mọi giá trị đều được lọc
 * theo whitelist trước khi thành query gửi đi.
 */
export function useProductsSearchParams() {
  const [searchParams, setSearchParams] = useSearchParams()

  const q = (searchParams.get("q") ?? "").trim()

  const categoryParam = Number(searchParams.get("categoryId"))
  const categoryId =
    Number.isInteger(categoryParam) && categoryParam >= 1 ? categoryParam : undefined

  const activeParam = searchParams.get("isActive")
  const isActive = activeParam === "true" ? true : activeParam === "false" ? false : undefined

  const sortParam = searchParams.get("sortBy")
  const sortBy = SORT_FIELDS.find((item) => item === sortParam) ?? DEFAULT_SORT.sortBy
  const orderParam = searchParams.get("order")
  const order: SortOrder =
    orderParam === "asc" || orderParam === "desc" ? orderParam : DEFAULT_SORT.order

  const pageParam = Number(searchParams.get("page"))
  const page = Number.isInteger(pageParam) && pageParam >= 1 ? pageParam : 1

  const params: ProductListParams = {
    q: q || undefined,
    categoryId,
    isActive,
    sortBy,
    order,
    page,
    limit: PAGE_SIZE,
  }

  const hasFilters = Boolean(q) || categoryId !== undefined || isActive !== undefined

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
    categoryId,
    isActive,
    sortBy,
    order,
    page,
    hasFilters,

    setQuery: (value: string) => update({ q: value.trim() }, { replace: true }),
    setCategory: (value: number | undefined) =>
      update({ categoryId: value === undefined ? undefined : String(value) }),
    setActive: (value: boolean | undefined) =>
      update({ isActive: value === undefined ? undefined : String(value) }),
    setPage: (value: number, replace = false) =>
      update({ page: value > 1 ? String(value) : undefined }, { resetPage: false, replace }),

    /** Bấm tiêu đề cột: đang sắp theo cột này thì đảo chiều, không thì sắp theo cột này. */
    toggleSort: (column: ProductSortBy) => {
      const nextOrder: SortOrder =
        column === sortBy ? (order === "asc" ? "desc" : "asc") : firstOrder(column)
      const isDefault = column === DEFAULT_SORT.sortBy && nextOrder === DEFAULT_SORT.order
      update({
        sortBy: isDefault ? undefined : column,
        order: isDefault ? undefined : nextOrder,
      })
    },

    clearFilters: () => update({ q: undefined, categoryId: undefined, isActive: undefined }),
  }
}

export type ProductsSearch = ReturnType<typeof useProductsSearchParams>
