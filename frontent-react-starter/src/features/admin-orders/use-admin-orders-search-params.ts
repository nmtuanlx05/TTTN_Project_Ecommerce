import { useSearchParams } from "react-router-dom"
import { PAGE_SIZE, STATUS_TABS } from "./constants"
import type { AdminOrderListParams, OrderStatus } from "./types"

const DATE_REGEX = /^\d{4}-\d{2}-\d{2}$/
const Q_MAX_LENGTH = 100

/** `YYYY-MM-DD` phải là ngày có thật (backend trả 400 với 2026-02-31). */
function validDate(value: string | null): string | undefined {
  if (!value || !DATE_REGEX.test(value)) return undefined
  const [y, m, d] = value.split("-").map(Number)
  const probe = new Date(Date.UTC(y, m - 1, d))
  return probe.getUTCMonth() === m - 1 && probe.getUTCDate() === d ? value : undefined
}

type UpdateOptions = {
  /** Đổi bộ lọc thì về trang 1. Chỉ đổi trang mới đặt false. */
  resetPage?: boolean
  replace?: boolean
}

/**
 * Trạng thái danh sách đơn nằm trên URL (`?status=&from=&to=&q=&page=`) để F5, Back và gửi link không mất. Mọi giá
 * trị được lọc theo whitelist trước khi gửi (backend dùng `forbidNonWhitelisted`, và `status=PACKING` bị 400).
 * Mặc định không ghi URL; sắp xếp cố định mới nhất trước nên không nằm trên URL. Đổi lọc dùng `replace`, đổi trang dùng `push`.
 */
export function useAdminOrdersSearchParams() {
  const [searchParams, setSearchParams] = useSearchParams()

  const q = (searchParams.get("q") ?? "").trim().slice(0, Q_MAX_LENGTH)
  const statusParam = searchParams.get("status")
  const status = STATUS_TABS.find((item) => item === statusParam)
  const from = validDate(searchParams.get("from"))
  let to = validDate(searchParams.get("to"))
  // from sau to: backend trả 400 INVALID_DATE_RANGE, nên bỏ `to`.
  if (from && to && from > to) to = undefined

  const pageParam = Number(searchParams.get("page"))
  const page = Number.isInteger(pageParam) && pageParam >= 1 ? pageParam : 1

  const params: AdminOrderListParams = {
    status,
    from,
    to,
    q: q || undefined,
    page,
    limit: PAGE_SIZE,
  }

  const hasFilters = Boolean(q) || status !== undefined || from !== undefined || to !== undefined

  function update(patch: Record<string, string | undefined>, { resetPage = true, replace = true }: UpdateOptions = {}) {
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
    from,
    to,
    page,
    hasFilters,

    setQuery: (value: string) => update({ q: value.trim() }),
    setStatus: (value: OrderStatus | undefined) => update({ status: value }),
    setFrom: (value: string) => update({ from: validDate(value) }),
    setTo: (value: string) => update({ to: validDate(value) }),
    setPage: (value: number, replace = false) =>
      update({ page: value > 1 ? String(value) : undefined }, { resetPage: false, replace }),
    clearFilters: () => update({ q: undefined, status: undefined, from: undefined, to: undefined }),
  }
}

export type AdminOrdersSearch = ReturnType<typeof useAdminOrdersSearchParams>
