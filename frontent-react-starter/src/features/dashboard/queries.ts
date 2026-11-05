import { keepPreviousData, useQuery, useQueryClient } from "@tanstack/react-query"
import type { ApiError } from "@/lib/api-error"
import type { DateRange } from "@/lib/date-range"
import { getDashboard } from "./api"
import type { DashboardData } from "./types"

/** Đủ ngắn để sau khi xác nhận đơn rồi quay lại, "Đơn cần xử lý" không cũ quá lâu. */
const STALE_TIME_MS = 30_000

export const dashboardKeys = {
  all: ["dashboard"] as const,
  range: (from: string, to: string) => ["dashboard", from, to] as const,
}

/**
 * Số liệu Tổng quan theo khoảng ngày. Đổi khoảng thì giữ dữ liệu cũ (`isPlaceholderData`) thay vì nháy skeleton.
 * `updatedAt` là thời điểm tải xong của đúng khoảng đang hiện: khi đang hiện dữ liệu cũ, query mới chưa có
 * `dataUpdatedAt` nên đọc từ cache của khoảng cũ (xác định bằng `data.range`).
 */
export function useDashboard(range: DateRange) {
  const queryClient = useQueryClient()
  const query = useQuery<DashboardData, ApiError>({
    queryKey: dashboardKeys.range(range.from, range.to),
    queryFn: ({ signal }) => getDashboard(range, signal),
    placeholderData: keepPreviousData,
    staleTime: STALE_TIME_MS,
  })
  const shown = query.data?.range
  const updatedAt = shown
    ? queryClient.getQueryState(dashboardKeys.range(shown.from, shown.to))?.dataUpdatedAt
    : undefined
  return { ...query, updatedAt }
}
