import { useCallback } from "react"
import { useSearchParams } from "react-router-dom"
import type { MyOrdersParams } from "./api"
import { GROUP_STATUSES, MAX_QUERY_LENGTH, ORDER_GROUPS, PAGE_SIZE, type OrderGroup } from "./constants"

type Patch = Record<string, string | undefined>

/**
 * Trạng thái danh sách nằm trên URL: `?status=<nhóm>&q=&page=`. Mặc định không ghi lên URL; giá trị lạ bị bỏ (whitelist).
 * Đổi nhóm/từ khóa dùng `replace` và về trang 1; đổi trang dùng `push` (Back từ trang 3 về trang 2).
 */
export function useOrdersSearchParams() {
  const [searchParams, setSearchParams] = useSearchParams()

  const group = ORDER_GROUPS.find((item) => item === searchParams.get("status"))
  const q = (searchParams.get("q") ?? "").trim().slice(0, MAX_QUERY_LENGTH)
  const pageParam = searchParams.get("page") ?? ""
  const page = /^\d+$/.test(pageParam) && Number(pageParam) >= 1 && Number.isSafeInteger(Number(pageParam)) ? Number(pageParam) : 1

  /** Query gửi backend; nhóm → `status=A,B`. */
  const params: MyOrdersParams = {
    status: group ? GROUP_STATUSES[group].join(",") : undefined,
    q: q || undefined,
    page,
    limit: PAGE_SIZE,
  }

  const next = useCallback(
    (patch: Patch, resetPage: boolean) => {
      const result = new URLSearchParams(searchParams)
      for (const [key, value] of Object.entries(patch)) {
        if (value === undefined || value === "") result.delete(key)
        else result.set(key, value)
      }
      if (resetPage) result.delete("page")
      return result
    },
    [searchParams],
  )

  const setQuery = useCallback(
    (value: string) => setSearchParams(next({ q: value.trim().slice(0, MAX_QUERY_LENGTH) }, true), { replace: true }),
    [next, setSearchParams],
  )

  return {
    group,
    q,
    page,
    params,
    hasFilters: group !== undefined || q !== "",
    setGroup: (value: OrderGroup | undefined) => setSearchParams(next({ status: value }, true), { replace: true }),
    setQuery,
    clearFilters: () => setSearchParams(next({ status: undefined, q: undefined }, true), { replace: true }),
    setPage: (value: number) => setSearchParams(next({ page: value > 1 ? String(value) : undefined }, false)),
    /** Chuỗi `?...` của trang `value`, cho `<Link>` của phân trang. */
    hrefForPage: (value: number) => {
      const query = next({ page: value > 1 ? String(value) : undefined }, false).toString()
      return query ? `?${query}` : "?"
    },
  }
}

export type OrdersSearch = ReturnType<typeof useOrdersSearchParams>
