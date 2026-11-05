import type { DailyPoint } from "../types"

export type MergedPoint = {
  date: string
  revenue: number
  orderCount: number
  previousDate: string | null
  previousRevenue: number | null
}

/** Ghép kỳ trước theo chỉ số ngày (API trả hai mảng cùng độ dài; thiếu thì null). */
export function mergeSeries(
  series: DailyPoint[],
  previousSeries: DailyPoint[],
): MergedPoint[] {
  return series.map((point, index) => {
    const previous = previousSeries[index] ?? null
    return {
      date: point.date,
      revenue: point.revenue,
      orderCount: point.orderCount,
      previousDate: previous?.date ?? null,
      previousRevenue: previous?.revenue ?? null,
    }
  })
}
