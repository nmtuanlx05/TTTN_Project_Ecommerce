import { formatNumber, formatVnd } from "@/lib/format"
import type { VoucherStats } from "../types"

/** Thống kê khi sửa. `ordersCount`/`totalDiscount` không tính đơn đã hủy; `usedCount` có thể lệch `ordersCount` với dữ liệu mẫu. */
function VoucherStatsBlock({ stats }: { stats: VoucherStats }) {
  const items = [
    { label: "Lượt dùng", value: formatNumber(stats.usedCount) },
    { label: "Số đơn đã dùng", value: formatNumber(stats.ordersCount) },
    { label: "Tổng tiền đã giảm", value: formatVnd(stats.totalDiscount) },
  ]
  return (
    <section aria-label="Thống kê voucher" className="flex flex-col gap-1.5">
      <dl className="grid grid-cols-3 gap-inline rounded-md border border-border-subtle bg-surface-sunken p-card">
        {items.map((item) => (
          <div key={item.label} className="min-w-0">
            <dt className="text-caption text-ink-muted">{item.label}</dt>
            <dd data-numeric className="text-body-sm font-semibold break-words text-ink">
              {item.value}
            </dd>
          </div>
        ))}
      </dl>
      <p className="text-caption text-ink-muted">Số đơn và tiền giảm không tính các đơn đã hủy.</p>
    </section>
  )
}

export { VoucherStatsBlock }
