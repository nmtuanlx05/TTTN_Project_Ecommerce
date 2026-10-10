import { ArrowDownRight, ArrowRight, ArrowUpRight } from "lucide-react"
import { cn } from "@/lib/utils"
import { Skeleton } from "@/components/ui/skeleton"
import {
  formatCompactVnd,
  formatNumber,
  formatSignedPercent,
  formatVnd,
} from "@/lib/format"
import type { KpiSnapshot } from "../mock"

type Metric = {
  key: keyof KpiSnapshot
  label: string
  /** Chú thích mẫu số — để không ai đem hai thẻ chia cho nhau rồi thắc mắc */
  note: string
  format: (value: number) => string
  title?: (value: number) => string
  /** Giảm là tốt hay xấu */
  invert?: boolean
}

const METRICS: Metric[] = [
  {
    key: "revenue",
    label: "Doanh thu",
    note: "Chỉ tính đơn đã giao",
    format: (value) => formatCompactVnd(value),
    title: (value) => formatVnd(value),
  },
  {
    key: "orderCount",
    label: "Số đơn",
    note: "Mọi trạng thái",
    format: formatNumber,
  },
  {
    key: "averageOrderValue",
    label: "Giá trị đơn trung bình",
    note: "Doanh thu đã giao ÷ mọi đơn",
    format: (value) => formatCompactVnd(value),
    title: (value) => formatVnd(value),
  },
  {
    key: "newCustomers",
    label: "Khách mới",
    note: "Tài khoản đăng ký trong kỳ",
    format: formatNumber,
  },
]

function changeRatio(current: number, previous: number): number | null {
  if (previous === 0) return null
  return (current - previous) / previous
}

function Delta({ ratio, invert }: { ratio: number | null; invert?: boolean }) {
  if (ratio === null) {
    return (
      <span className="text-caption text-ink-muted">Kỳ trước không có dữ liệu</span>
    )
  }

  const flat = Math.abs(ratio) < 0.0005
  const positive = ratio > 0
  const good = invert ? !positive : positive
  const Icon = flat ? ArrowRight : positive ? ArrowUpRight : ArrowDownRight

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 text-caption font-medium",
        flat ? "text-ink-muted" : good ? "text-success-fg" : "text-danger-fg",
      )}
    >
      <Icon className="size-3.5" aria-hidden="true" />
      {formatSignedPercent(ratio)}
      <span className="font-normal text-ink-muted">so với kỳ trước</span>
    </span>
  )
}

function KpiCards({
  current,
  previous,
}: {
  current: KpiSnapshot
  previous: KpiSnapshot
}) {
  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
      {METRICS.map((metric) => {
        const value = current[metric.key]
        return (
          <div
            key={metric.key}
            className="flex flex-col gap-1 rounded-md border border-border-subtle bg-surface p-card"
          >
            <p className="text-overline uppercase text-ink-muted">{metric.label}</p>
            {/* Con số lớn dùng font body, chữ số tỉ lệ tự nhiên — không tabular,
                vì ở cỡ lớn chữ số đều chiều rộng trông rời rạc */}
            <p
              className="text-h1 font-semibold text-ink"
              title={metric.title?.(value)}
            >
              {metric.format(value)}
            </p>
            <Delta
              ratio={changeRatio(value, previous[metric.key])}
              invert={metric.invert}
            />
            <p className="mt-1 text-caption text-ink-muted">{metric.note}</p>
          </div>
        )
      })}
    </div>
  )
}

function KpiCardsSkeleton() {
  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
      {METRICS.map((metric) => (
        <div
          key={metric.key}
          className="flex flex-col gap-2 rounded-md border border-border-subtle bg-surface p-card"
        >
          <Skeleton className="h-3 w-24" />
          <Skeleton className="h-8 w-32" />
          <Skeleton className="h-3 w-40" />
        </div>
      ))}
    </div>
  )
}

export { KpiCards, KpiCardsSkeleton }
