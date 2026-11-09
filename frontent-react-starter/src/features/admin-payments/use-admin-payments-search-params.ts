import { useSearchParams } from "react-router-dom"
import { DEFAULT_REVIEW, PAGE_SIZE, REVIEW_FILTERS } from "./constants"
import type { ReviewFilter, TransactionListParams } from "./types"

/** Trạng thái bảng giao dịch nằm trên URL (`?review=&page=`); giá trị lạ bị bỏ (backend trả 400 với `review` ngoài danh sách). */
export function useAdminPaymentsSearchParams() {
  const [searchParams, setSearchParams] = useSearchParams()

  const reviewParam = searchParams.get("review")
  const review = REVIEW_FILTERS.find((item) => item.value === reviewParam)?.value ?? DEFAULT_REVIEW
  const pageParam = Number(searchParams.get("page"))
  const page = Number.isInteger(pageParam) && pageParam >= 1 ? pageParam : 1

  const params: TransactionListParams = { review, page, limit: PAGE_SIZE }

  return {
    params,
    review,
    page,
    setReview: (value: ReviewFilter) =>
      setSearchParams((previous) => {
        const next = new URLSearchParams(previous)
        if (value === DEFAULT_REVIEW) next.delete("review")
        else next.set("review", value)
        next.delete("page")
        return next
      }),
    setPage: (value: number, replace = false) =>
      setSearchParams(
        (previous) => {
          const next = new URLSearchParams(previous)
          if (value > 1) next.set("page", String(value))
          else next.delete("page")
          return next
        },
        { replace },
      ),
  }
}

export type AdminPaymentsSearch = ReturnType<typeof useAdminPaymentsSearchParams>
