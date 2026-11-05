import { formatDayMonth, formatNumber, formatVnd } from "@/lib/format"
import type { MergedPoint } from "./revenue-chart-data"

/** Bản bảng tương đương của biểu đồ — mọi giá trị đọc được không cần rê chuột. */
function RevenueChartTable({ data }: { data: MergedPoint[] }) {
  return (
    <details className="text-caption">
      <summary className="cursor-pointer rounded-xs text-ink-muted outline-none hover:text-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring">
        Xem dạng bảng
      </summary>
      <div className="mt-stack max-h-64 overflow-auto rounded-xs border border-border-subtle">
        <table className="w-full text-caption">
          <caption className="sr-only">
            Doanh thu từng ngày của kỳ này và kỳ trước, kèm số đơn đặt trong ngày
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
              <th scope="col" className="px-3 py-1.5 text-right text-ink-muted">
                Số đơn đặt (theo ngày đặt)
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
                  {point.previousRevenue === null ? "—" : formatVnd(point.previousRevenue)}
                </td>
                <td data-numeric className="px-3 py-1.5 text-right text-ink">
                  {formatNumber(point.orderCount)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </details>
  )
}

export { RevenueChartTable }
