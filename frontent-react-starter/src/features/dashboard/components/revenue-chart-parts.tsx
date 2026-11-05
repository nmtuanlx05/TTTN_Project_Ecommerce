import { formatCompactVnd, formatDayMonth, formatFullDate, formatVnd } from "@/lib/format"
import type { MergedPoint } from "./revenue-chart-data"

export function ChartTooltip({
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

export function LastPointLabel({ x, y, value, index, dataLength }: LabelProps & { dataLength: number }) {
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

export function Legend() {
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
