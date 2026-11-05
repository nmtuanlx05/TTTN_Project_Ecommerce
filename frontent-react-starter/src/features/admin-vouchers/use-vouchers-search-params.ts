import { useSearchParams } from "react-router-dom"
import type { SortOrder } from "@/types/api"
import { DEFAULT_SORT, PAGE_SIZE, SORT_FIELDS, STATUSES } from "./constants"
import type { VoucherListParams, VoucherSortBy, VoucherStatus } from "./types"

type UpdateOptions = {
  /** Đổi bộ lọc/sắp xếp thì về trang 1. Chỉ đổi trang mới đặt false. */
  resetPage?: boolean
  /** Ghi đè dòng lịch sử thay vì thêm mới (dùng khi gõ tìm kiếm). */
  replace?: boolean
}

/** Lần bấm đầu vào một cột: mã A → Z, còn lại mới/nhiều nhất trước. */
function firstOrder(sortBy: VoucherSortBy): SortOrder {
  return sortBy === "code" ? "asc" : "desc"
}

/**
 * Toàn bộ trạng thái bảng voucher nằm trên URL (`?q=&status=&sortBy=&order=&page=`) để F5 hoặc gửi link không mất.
 * Giá trị trên URL không đáng tin (backend `forbidNonWhitelisted` trả 400 với `?status=foo`), nên mọi giá trị
 * đều được lọc theo whitelist trước khi thành query gửi đi.
 */
export function useVouchersSearchParams() {
  const [searchParams, setSearchParams] = useSearchParams()

  const q = (searchParams.get("q") ?? "").trim()
  const statusParam = searchParams.get("status")
  const status = STATUSES.find((item) => item === statusParam)

  const sortParam = searchParams.get("sortBy")
  const sortBy = SORT_FIELDS.find((item) => item === sortParam) ?? DEFAULT_SORT.sortBy
  const orderParam = searchParams.get("order")
  const order: SortOrder =
    orderParam === "asc" || orderParam === "desc" ? orderParam : DEFAULT_SORT.order

  const pageParam = Number(searchParams.get("page"))
  const page = Number.isInteger(pageParam) && pageParam >= 1 ? pageParam : 1

  const params: VoucherListParams = {
    q: q || undefined,
    status,
    sortBy,
    order,
    page,
    limit: PAGE_SIZE,
  }

  const hasFilters = Boolean(q) || status !== undefined

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
    status,
    sortBy,
    order,
    page,
    hasFilters,

    setQuery: (value: string) => update({ q: value.trim() }, { replace: true }),
    setStatus: (value: VoucherStatus | undefined) => update({ status: value }),
    setPage: (value: number, replace = false) =>
      update({ page: value > 1 ? String(value) : undefined }, { resetPage: false, replace }),

    /** Bấm tiêu đề cột: đang sắp theo cột này thì đảo chiều, không thì sắp theo cột này. */
    toggleSort: (column: VoucherSortBy) => {
      const nextOrder: SortOrder =
        column === sortBy ? (order === "asc" ? "desc" : "asc") : firstOrder(column)
      const isDefault = column === DEFAULT_SORT.sortBy && nextOrder === DEFAULT_SORT.order
      update({
        sortBy: isDefault ? undefined : column,
        order: isDefault ? undefined : nextOrder,
      })
    },

    clearFilters: () => update({ q: undefined, status: undefined }),
  }
}

export type VouchersSearch = ReturnType<typeof useVouchersSearchParams>
