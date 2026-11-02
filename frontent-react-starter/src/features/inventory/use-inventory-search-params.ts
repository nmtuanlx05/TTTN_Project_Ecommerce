import { useSearchParams } from "react-router-dom"
import type { SortOrder } from "@/types/api"
import { DEFAULT_SORT, PAGE_SIZE, SEARCH_MAX_LENGTH, SORT_FIELDS, STOCK_STATUSES } from "./constants"
import type { InventoryListParams, InventorySummaryParams, StockStatus } from "./types"

type UpdateOptions = {
  /** Đổi bộ lọc/sắp xếp thì về trang 1. Chỉ đổi trang mới đặt false. */
  resetPage?: boolean
  /** Ghi đè dòng lịch sử thay vì thêm mới (dùng khi gõ tìm kiếm). */
  replace?: boolean
}

/**
 * Toàn bộ trạng thái bảng kho nằm trên URL (`?q=&categoryId=&stockStatus=&includeHidden=&sortBy=&order=&page=`)
 * để F5, Back hoặc gửi link không mất. Giá trị trên URL không đáng tin: backend dùng
 * `forbidNonWhitelisted`, nên mọi giá trị đều được lọc theo whitelist trước khi thành query gửi đi.
 */
export function useInventorySearchParams() {
  const [searchParams, setSearchParams] = useSearchParams()

  const q = (searchParams.get("q") ?? "").trim().slice(0, SEARCH_MAX_LENGTH)

  const categoryParam = Number(searchParams.get("categoryId"))
  const categoryId =
    Number.isInteger(categoryParam) && categoryParam >= 1 ? categoryParam : undefined

  const statusParam = searchParams.get("stockStatus")
  const stockStatus = STOCK_STATUSES.find((status) => status === statusParam)

  const includeHidden = searchParams.get("includeHidden") === "true"

  const sortParam = searchParams.get("sortBy")
  const sortBy = SORT_FIELDS.find((item) => item === sortParam) ?? DEFAULT_SORT.sortBy
  const orderParam = searchParams.get("order")
  const order: SortOrder =
    orderParam === "asc" || orderParam === "desc" ? orderParam : DEFAULT_SORT.order

  const pageParam = Number(searchParams.get("page"))
  const page = Number.isInteger(pageParam) && pageParam >= 1 ? pageParam : 1

  const params: InventoryListParams = {
    q: q || undefined,
    categoryId,
    stockStatus,
    includeHidden: includeHidden ? true : undefined,
    sortBy,
    order,
    page,
    limit: PAGE_SIZE,
  }

  /** Thẻ số liệu theo cùng danh mục và cờ `includeHidden` với bảng; API không nhận `q` hay `stockStatus`. */
  const summaryParams: InventorySummaryParams = {
    categoryId,
    includeHidden: includeHidden ? true : undefined,
  }

  const hasFilters = Boolean(q) || categoryId !== undefined || stockStatus !== undefined || includeHidden

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
    summaryParams,
    q,
    categoryId,
    stockStatus,
    includeHidden,
    sortBy,
    order,
    page,
    hasFilters,

    setQuery: (value: string) => update({ q: value.trim() }, { replace: true }),
    setCategory: (value: number | undefined) =>
      update({ categoryId: value === undefined ? undefined : String(value) }),
    setStockStatus: (value: StockStatus | undefined) => update({ stockStatus: value }),
    setIncludeHidden: (value: boolean) => update({ includeHidden: value ? "true" : undefined }),
    setPage: (value: number, replace = false) =>
      update({ page: value > 1 ? String(value) : undefined }, { resetPage: false, replace }),

    /** Bấm tiêu đề cột: đang sắp theo cột này thì đảo chiều, không thì sắp tăng dần (hàng gần hết lên đầu). */
    toggleSort: (column: (typeof SORT_FIELDS)[number]) => {
      const nextOrder: SortOrder = column === sortBy && order === "asc" ? "desc" : "asc"
      const isDefault = column === DEFAULT_SORT.sortBy && nextOrder === DEFAULT_SORT.order
      update({
        sortBy: isDefault ? undefined : column,
        order: isDefault ? undefined : nextOrder,
      })
    },

    clearFilters: () =>
      update({ q: undefined, categoryId: undefined, stockStatus: undefined, includeHidden: undefined }),
  }
}

export type InventorySearch = ReturnType<typeof useInventorySearchParams>
