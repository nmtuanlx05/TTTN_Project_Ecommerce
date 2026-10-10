import { useEffect, useState } from "react"
import type { DateRange } from "@/lib/date-range"
import {
  MOCK_LATENCY_MS,
  getDashboardData,
  type DashboardData,
} from "./mock"

/**
 * Điểm sẽ thay bằng react-query khi nối API thật: hiện đây là `useEffect` +
 * `setTimeout` giả lập độ trễ trên dữ liệu mock. Khi có `api.ts`, viết lại thân
 * hook bằng `useQuery({ queryKey: ["dashboard", range], queryFn })` và giữ nguyên
 * giá trị trả về (`data`, `isRefreshing`) để component không phải sửa.
 */
export function useDashboardData(range: DateRange) {
  // Giữ cả khoảng đã tải cùng dữ liệu, nên "đang tải" là thứ suy ra được chứ
  // không phải một state thứ hai phải đồng bộ tay.
  const [loaded, setLoaded] = useState<{
    range: DateRange
    data: DashboardData
  } | null>(null)

  useEffect(() => {
    let cancelled = false
    const timer = setTimeout(() => {
      if (!cancelled) setLoaded({ range, data: getDashboardData(range) })
    }, MOCK_LATENCY_MS)

    return () => {
      cancelled = true
      clearTimeout(timer)
    }
  }, [range])

  const data = loaded?.data ?? null
  const isRefreshing = loaded?.range !== range

  return { data, isRefreshing }
}
