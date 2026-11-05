import { PageHeader } from "@/components/admin/page-header"
import { DashboardContent } from "@/features/dashboard/components/dashboard-content"
import { DashboardError } from "@/features/dashboard/components/dashboard-error"
import { DashboardSkeleton } from "@/features/dashboard/components/dashboard-skeleton"
import { DateRangePicker } from "@/features/dashboard/components/date-range-picker"
import { useDashboard } from "@/features/dashboard/queries"
import { useRangeState } from "@/features/dashboard/use-range-state"
import { formatDateRange, formatTime } from "@/lib/format"

function describeHeader(
  data: ReturnType<typeof useDashboard>["data"],
  requested: { from: string; to: string },
  updatedAt: number | undefined,
) {
  // Kỳ trước và khoảng đang hiện lấy từ API (khi đang hiện dữ liệu cũ thì khớp với nội dung đó)
  if (!data) return `Số liệu từ ${formatDateRange(requested.from, requested.to)}.`
  const updated = updatedAt ? ` Cập nhật lúc ${formatTime(new Date(updatedAt))}.` : ""
  return `Số liệu từ ${formatDateRange(data.range.from, data.range.to)}, so với ${formatDateRange(data.previousRange.from, data.previousRange.to)}.${updated}`
}

function DashboardPage() {
  const { preset, setPreset, setCustomRange, range } = useRangeState()
  const { data, error, isPlaceholderData, refetch, updatedAt } = useDashboard(range)

  return (
    <div className="flex flex-col gap-section">
      <PageHeader
        title="Tổng quan"
        description={describeHeader(data, range, updatedAt)}
        actions={
          <DateRangePicker
            preset={preset}
            customRange={range}
            onPresetChange={setPreset}
            onCustomRangeChange={setCustomRange}
          />
        }
      />

      <p aria-live="polite" className="sr-only">
        {isPlaceholderData ? "Đang tải số liệu" : "Đã cập nhật số liệu"}
      </p>

      {error ? (
        <DashboardError error={error} onRetry={() => void refetch()} />
      ) : data === undefined ? (
        <DashboardSkeleton />
      ) : (
        <DashboardContent data={data} isRefreshing={isPlaceholderData} />
      )}
    </div>
  )
}

export default DashboardPage
