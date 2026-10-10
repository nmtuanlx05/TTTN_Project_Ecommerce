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
import {
  formatCompactVnd,
  formatDayMonth,
  formatFullDate,
  formatVnd,
} from "@/lib/format"
import type { DailyPoint } from "../mock"

/**
 * Doanh thu theo ngày — đơn sắc, một trục.
 *
 * Màu đọc thẳng từ biến CSS trong SVG (`var(--ink)`), nên dark mode tự đổi mà
 * không cần JS theo dõi theme. Không gradient, không đổ bóng: vùng tô là một
 * lớp mực mỏng cùng màu đường.
 *
 * Kỳ trước phân biệt bằng CẢ độ sáng lẫn nét đứt, không chỉ bằng màu — hai
 * series này gần như cùng sắc độ nên nét vẽ mới là thứ mang danh tính.
 */

type MergedPoint = {
  date: string
  revenue: number
  previousDate: string | null
  previousRevenue: number | null
}

function mergeSeries(
  series: DailyPoint[],
  previousSeries: DailyPoint[],
): MergedPoint[] {
  return series.map((point, index) => {
    const previous = previousSeries[index] ?? null
    return {
      date: point.date,
      revenue: point.revenue,
      previousDate: previous?.date ?? null,
      previousRevenue: previous?.revenue ?? null,
    }
  })
}

function ChartTooltip({
  active,
  payload,
}: {
  active?: boolean
  payload?: { payload: MergedPoint }[]
}) {
  if (!active || !payload?.length) return null
  const point = payload[0].payload

  return (
    <div className="rounded-md border border-border-default bg-surface-raised px-3 py-2 text-caption">
      <p className="font-medium text-ink">{formatFullDate(point.date)}</p>
      <p className="mt-1 text-ink">
        Kỳ này: <span data-numeric>{formatVnd(point.revenue)}</span>
      </p>
      {point.previousRevenue !== null && point.previousDate ? (
        <p className="text-ink-muted">
          Kỳ trước ({formatDayMonth(point.previousDate)}):{" "}
          <span data-numeric>{formatVnd(point.previousRevenue)}</span>
        </p>
      ) : null}
    </div>
  )
}

/** Nhãn trực tiếp cho đúng điểm cuối — không ghi số lên mọi điểm. */
type LabelProps = {
  x?: unknown
  y?: unknown
  value?: unknown
  index?: number
}

function renderLastPointLabel(props: LabelProps, dataLength: number) {
  const { x, y, value, index } = props
  if (index !== dataLength - 1 || x === undefined || y === undefined) return null

  return (
    <text
      x={Number(x)}
      y={Number(y) - 10}
      textAnchor="end"
      className="text-caption"
      fill="var(--ink)"
      fontWeight={600}
    >
      {formatCompactVnd(Number(value), true)}
    </text>
  )
}

function Legend() {
  return (
    <div className="flex flex-wrap items-center gap-4 text-caption text-ink-muted">
      <span className="inline-flex items-center gap-1.5">
        <svg width="18" height="8" aria-hidden="true">
          <line x1="0" y1="4" x2="18" y2="4" stroke="var(--ink)" strokeWidth="2" />
        </svg>
        Kỳ này
      </span>
      <span className="inline-flex items-center gap-1.5">
        <svg width="18" height="8" aria-hidden="true">
          <line
            x1="0"
            y1="4"
            x2="18"
            y2="4"
            stroke="var(--ink-subtle)"
            strokeWidth="2"
            strokeDasharray="4 3"
          />
        </svg>
        Kỳ trước
      </span>
    </div>
  )
}

function RevenueChart({
  series,
  previousSeries,
}: {
  series: DailyPoint[]
  previousSeries: DailyPoint[]
}) {
  const isMobile = useIsMobile()
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
            Chỉ tính đơn đã giao
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
              dot={false}
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
              dot={false}
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
                content={(props) => renderLastPointLabel(props, data.length)}
              />
            </Area>
          </AreaChart>
        </ResponsiveContainer>
      </div>

      {/* Bản bảng tương đương — mọi giá trị đọc được không cần rê chuột */}
      <details className="text-caption">
        <summary className="cursor-pointer rounded-xs text-ink-muted outline-none hover:text-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring">
          Xem dạng bảng
        </summary>
        <div className="mt-stack max-h-64 overflow-auto rounded-xs border border-border-subtle">
          <table className="w-full text-caption">
            <caption className="sr-only">
              Doanh thu từng ngày của kỳ này và kỳ trước
            </caption>
            <thead className="sticky top-0 bg-surface-sunken">
              <tr>
                <th scope="col" className="px-3 py-1.5 text-left text-ink-muted">
                  Ngày
                </th>
                <th scope="col" className="px-3 py-1.5 text-right text-ink-muted">
                  Kỳ này
                </th>
                <th scope="col" className="px-3 py-1.5 text-right text-ink-muted">
                  Kỳ trước
                </th>
              </tr>
            </thead>
            <tbody>
              {data.map((point) => (
                <tr key={point.date} className="border-t border-border-subtle">
                  <td className="px-3 py-1.5 text-ink">{formatDayMonth(point.date)}</td>
                  <td data-numeric className="px-3 py-1.5 text-right text-ink">
                    {formatVnd(point.revenue)}
                  </td>
                  <td data-numeric className="px-3 py-1.5 text-right text-ink-muted">
                    {point.previousRevenue === null
                      ? "—"
                      : formatVnd(point.previousRevenue)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </details>
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
