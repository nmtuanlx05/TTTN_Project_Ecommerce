import { useCallback } from "react"
import { useSearchParams } from "react-router-dom"
import { DEFAULT_SORT, PAGE_SIZE, PRICE_MAX, SORT_OPTIONS, SORT_QUERY } from "./constants"
import type { CatalogListParams, CatalogSort } from "./types"

type Patch = Record<string, string | undefined>

const DIGITS = /^\d+$/

function readInt(value: string | null, min: number, max: number): number | undefined {
  if (value === null || !DIGITS.test(value)) return undefined
  const number = Number(value)
  return Number.isSafeInteger(number) && number >= min && number <= max ? number : undefined
}

/**
 * Trạng thái danh sách nằm trên URL: `?category=<slug>&q=&sort=&minPrice=&maxPrice=&page=`. Giá trị mặc định
 * không ghi lên URL. Giá trị trên URL không đáng tin nên mọi thứ lọc theo whitelist trước khi gửi
 * (backend dùng `forbidNonWhitelisted`, và `minPrice > maxPrice` bị 400 nên cả hai bị bỏ).
 *
 * Lịch sử: đổi bộ lọc/sắp xếp dùng `replace` (Back không phải đi lại từng lần bấm lọc); đổi trang dùng `push`
 * (Back từ trang 3 về trang 2). Các liên kết lọc (`hrefFor`) cũng nên mở bằng `<Link replace>`.
 */
export function useCatalogSearchParams() {
  const [searchParams, setSearchParams] = useSearchParams()

  const categorySlug = (searchParams.get("category") ?? "").trim() || undefined
  const q = (searchParams.get("q") ?? "").trim()

  const sortParam = searchParams.get("sort")
  const sort: CatalogSort =
    SORT_OPTIONS.find((option) => option.value === sortParam)?.value ?? DEFAULT_SORT

  let minPrice = readInt(searchParams.get("minPrice"), 0, PRICE_MAX)
  let maxPrice = readInt(searchParams.get("maxPrice"), 0, PRICE_MAX)
  if (minPrice !== undefined && maxPrice !== undefined && minPrice > maxPrice) {
    minPrice = undefined
    maxPrice = undefined
  }

  const page = readInt(searchParams.get("page"), 1, PRICE_MAX) ?? 1

  const hasFilters =
    Boolean(q) || categorySlug !== undefined || minPrice !== undefined || maxPrice !== undefined

  /** Query gửi backend. `categoryId` do nơi gọi tra từ slug (backend không nhận slug). */
  function toListParams(categoryId?: number): CatalogListParams {
    return { q: q || undefined, categoryId, minPrice, maxPrice, ...SORT_QUERY[sort], page, limit: PAGE_SIZE }
  }

  const nextParams = useCallback(
    (patch: Patch, resetPage: boolean) => {
      const next = new URLSearchParams(searchParams)
      for (const [key, value] of Object.entries(patch)) {
        if (value === undefined || value === "") next.delete(key)
        else next.set(key, value)
      }
      if (resetPage) next.delete("page")
      return next
    },
    [searchParams],
  )

  /** Chuỗi `?...` của bộ lọc hiện tại sau khi áp `patch` (về trang 1 nếu không phải đổi trang). Dùng cho `<Link>`. */
  function hrefFor(patch: Patch, { resetPage = true } = {}): string {
    const query = nextParams(patch, resetPage).toString()
    return query ? `?${query}` : "?"
  }

  function update(patch: Patch, { replace, resetPage }: { replace: boolean; resetPage: boolean }) {
    setSearchParams(nextParams(patch, resetPage), { replace })
  }

  return {
    categorySlug,
    q,
    sort,
    minPrice,
    maxPrice,
    page,
    hasFilters,
    toListParams,
    hrefFor,

    setCategory: (slug: string | undefined) => update({ category: slug }, { replace: true, resetPage: true }),
    setSort: (value: CatalogSort) =>
      update({ sort: value === DEFAULT_SORT ? undefined : value }, { replace: true, resetPage: true }),
    setPriceRange: (min: number | undefined, max: number | undefined) =>
      update(
        { minPrice: min === undefined ? undefined : String(min), maxPrice: max === undefined ? undefined : String(max) },
        { replace: true, resetPage: true },
      ),
    clearQuery: () => update({ q: undefined }, { replace: true, resetPage: true }),
    /** Xóa mọi bộ lọc (danh mục, từ khóa, giá); giữ kiểu sắp xếp. */
    clearFilters: () =>
      update(
        { category: undefined, q: undefined, minPrice: undefined, maxPrice: undefined },
        { replace: true, resetPage: true },
      ),
    /** Đổi trang dùng push (khác mọi thao tác lọc ở trên). */
    setPage: (value: number) =>
      update({ page: value > 1 ? String(value) : undefined }, { replace: false, resetPage: false }),
  }
}

export type CatalogSearch = ReturnType<typeof useCatalogSearchParams>
