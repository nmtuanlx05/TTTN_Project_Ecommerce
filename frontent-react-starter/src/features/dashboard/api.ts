import { apiGet } from "@/lib/api-client"
import type { DateRange } from "@/lib/date-range"
import type { DashboardData } from "./types"

/** Gọi API tổng quan quản trị (chỉ ADMIN). Chỉ `queries.ts` được import file này. */
export function getDashboard(range: DateRange, signal?: AbortSignal): Promise<DashboardData> {
  return apiGet<DashboardData>("/admin/dashboard", {
    params: { from: range.from, to: range.to },
    signal,
  })
}
