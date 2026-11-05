import { useMemo } from "react"
import {
  Area,
  AreaChart,
  CartesianGrid,
  LabelList,
  Line,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts"
import { useIsMobile } from "@/hooks/use-mobile"
import { Skeleton } from "@/components/ui/skeleton"
import { formatCompactVnd, formatDayMonth } from "@/lib/format"
import type { DailyPoint } from "../types"
import { mergeSeries } from "./revenue-chart-data"
import { ChartTooltip, LastPointLabel, Legend } from "./revenue-chart-parts"
import { RevenueChartTable } from "./revenue-chart-table"

/**
 * Doanh thu theo ngày hoàn thành đơn — đơn sắc, một trục. Màu đọc từ biến CSS (`var(--ink)`);
 * kỳ trước phân biệt bằng cả độ sáng lẫn nét đứt. Ca biên: toàn 0 thì cố định trục 0–100 nghìn
 * (tránh trục suy biến); một ngày thì vẽ chấm vì một điểm không tạo được đường.
 */
const EMPTY_AXIS_MAX = 100_000

function RevenueChart({
  series,
  previousSeries,
}: {
  series: DailyPoint[]
  previousSeries: DailyPoint[]
}) {
  const isMobile = useIsMobile()
  const allZero = series.every((p) => p.revenue === 0) && previousSeries.every((p) => p.revenue === 0)
  const singleDay = series.length === 1
  const data = useMemo(
    () => mergeSeries(series, previousSeries),
    [series, previousSeries],
  )

  return (
    <section
      aria-labelledby="revenue-chart-title"
      className="flex flex-col gap-stack rounded-md border border-border-subtle bg-surface p-card"
    >
      <div className="flex flex-wrap items-start justify-between gap-inline">
        <div>
          <h2 id="revenue-chart-title" className="font-display text-h3 text-ink">
            Doanh thu theo ngày
          </h2>
          <p className="mt-0.5 text-caption text-ink-muted">
            Doanh thu theo ngày hoàn thành đơn
          </p>
        </div>
        <Legend />
      </div>

      {/* Chiều cao gồm cả dải nhãn trục X, không để trục bị cắt */}
      <div className="h-72 w-full min-w-0">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={data} margin={{ top: 16, right: 12, bottom: 0, left: 0 }}>
            <CartesianGrid
              vertical={false}
              stroke="var(--border-subtle)"
              strokeWidth={1}
            />
            <XAxis
              dataKey="date"
              tickFormatter={formatDayMonth}
              axisLine={false}
              tickLine={false}
              tickMargin={10}
              minTickGap={28}
              interval="preserveStartEnd"
              tick={{ fill: "var(--ink-muted)", fontSize: 11 }}
            />
            <YAxis
              width={isMobile ? 52 : 68}
              domain={allZero ? [0, EMPTY_AXIS_MAX] : [0, "auto"]}
              tickFormatter={(value: number) => formatCompactVnd(value, isMobile)}
              axisLine={false}
              tickLine={false}
              tickMargin={8}
              tick={{ fill: "var(--ink-muted)", fontSize: 11 }}
            />
            <Tooltip
              content={<ChartTooltip />}
              cursor={{ stroke: "var(--border-strong)", strokeWidth: 1 }}
            />
            <Line
              type="monotone"
              dataKey="previousRevenue"
              name="Kỳ trước"
              stroke="var(--ink-subtle)"
              strokeWidth={1.5}
              strokeDasharray="4 3"
              dot={singleDay ? { r: 3, fill: "var(--ink-subtle)", strokeWidth: 0 } : false}
              activeDot={false}
              isAnimationActive={false}
              connectNulls
            />
            <Area
              type="monotone"
              dataKey="revenue"
              name="Kỳ này"
              stroke="var(--ink)"
              strokeWidth={2}
              fill="var(--ink)"
              fillOpacity={0.07}
              dot={singleDay ? { r: 4, fill: "var(--ink)", strokeWidth: 0 } : false}
              activeDot={{
                r: 4,
                fill: "var(--ink)",
                stroke: "var(--surface)",
                strokeWidth: 2,
              }}
              isAnimationActive={false}
            >
              <LabelList
                dataKey="revenue"
                content={(props) => <LastPointLabel {...props} dataLength={data.length} />}
              />
            </Area>
          </AreaChart>
        </ResponsiveContainer>
      </div>

      <RevenueChartTable data={data} />
    </section>
  )
}

function RevenueChartSkeleton() {
  return (
    <div className="flex flex-col gap-stack rounded-md border border-border-subtle bg-surface p-card">
      <Skeleton className="h-5 w-48" />
      <Skeleton className="h-72 w-full" />
    </div>
  )
}

export { RevenueChart, RevenueChartSkeleton }
