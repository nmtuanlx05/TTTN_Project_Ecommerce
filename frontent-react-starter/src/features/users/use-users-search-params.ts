import { useSearchParams } from "react-router-dom"
import type { SortOrder } from "@/types/api"
import type { Role, UserListParams, UserSortBy } from "./types"
import { DEFAULT_SORT, PAGE_SIZE, ROLES, SORTABLE_COLUMNS } from "./constants"

type UpdateOptions = {
  /** Đổi bộ lọc/sắp xếp thì về trang 1. Chỉ đổi trang mới đặt false. */
  resetPage?: boolean
  /** Ghi đè dòng lịch sử thay vì thêm mới (dùng khi gõ tìm kiếm). */
  replace?: boolean
}

/** Giá trị đầu tiên khi bấm một cột: ngày tạo mới nhất trước, còn lại A → Z. */
function firstOrder(sortBy: UserSortBy): SortOrder {
  return sortBy === "createdAt" ? "desc" : "asc"
}

/**
 * Toàn bộ trạng thái bảng người dùng nằm trên URL (`?q=&role=&isActive=&sortBy=&order=&page=`)
 * để F5 hoặc gửi link không mất. Giá trị trên URL không đáng tin: backend dùng
 * `forbidNonWhitelisted` nên một `?role=foo` sẽ bị 400, vì vậy mọi giá trị đều
 * được lọc theo whitelist trước khi thành query gửi đi.
 */
export function useUsersSearchParams() {
  const [searchParams, setSearchParams] = useSearchParams()

  const q = (searchParams.get("q") ?? "").trim()

  const roleParam = searchParams.get("role")
  const role = ROLES.find((item) => item === roleParam)

  const activeParam = searchParams.get("isActive")
  const isActive = activeParam === "true" ? true : activeParam === "false" ? false : undefined

  const sortParam = searchParams.get("sortBy")
  const sortBy = SORTABLE_COLUMNS.find((item) => item === sortParam) ?? DEFAULT_SORT.sortBy
  const orderParam = searchParams.get("order")
  const order: SortOrder =
    orderParam === "asc" || orderParam === "desc" ? orderParam : DEFAULT_SORT.order

  const pageParam = Number(searchParams.get("page"))
  const page = Number.isInteger(pageParam) && pageParam >= 1 ? pageParam : 1

  const params: UserListParams = {
    q: q || undefined,
    role,
    isActive,
    sortBy,
    order,
    page,
    limit: PAGE_SIZE,
  }

  const hasFilters = Boolean(q) || role !== undefined || isActive !== undefined

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
    role,
    isActive,
    sortBy,
    order,
    page,
    hasFilters,

    setQuery: (value: string) => update({ q: value.trim() }, { replace: true }),
    setRole: (value: Role | undefined) => update({ role: value }),
    setActive: (value: boolean | undefined) =>
      update({ isActive: value === undefined ? undefined : String(value) }),
    setPage: (value: number, replace = false) =>
      update({ page: value > 1 ? String(value) : undefined }, { resetPage: false, replace }),

    /** Bấm tiêu đề cột: đang sắp theo cột này thì đảo chiều, không thì sắp theo cột này. */
    toggleSort: (column: UserSortBy) => {
      const nextOrder: SortOrder =
        column === sortBy ? (order === "asc" ? "desc" : "asc") : firstOrder(column)
      const isDefault = column === DEFAULT_SORT.sortBy && nextOrder === DEFAULT_SORT.order
      update({
        sortBy: isDefault ? undefined : column,
        order: isDefault ? undefined : nextOrder,
      })
    },

    clearFilters: () => update({ q: undefined, role: undefined, isActive: undefined }),
  }
}

export type UsersSearch = ReturnType<typeof useUsersSearchParams>
