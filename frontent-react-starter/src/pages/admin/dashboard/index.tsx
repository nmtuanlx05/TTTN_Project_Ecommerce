import { PageHeader } from "@/components/admin/page-header"
import { DashboardContent } from "@/features/dashboard/components/dashboard-content"
import { DashboardSkeleton } from "@/features/dashboard/components/dashboard-skeleton"
import { DateRangePicker } from "@/features/dashboard/components/date-range-picker"
import { useDashboardData } from "@/features/dashboard/queries"
import { useRangeState } from "@/features/dashboard/use-range-state"
import { formatDateRange, formatTime } from "@/lib/format"
import { previousRange } from "@/lib/date-range"

function DashboardPage() {
  const { preset, setPreset, customRange, setCustomRange, range } = useRangeState()
  const { data, isRefreshing } = useDashboardData(range)
  const comparison = previousRange(range)

  return (
    <div className="flex flex-col gap-section">
      <PageHeader
        title="Tổng quan"
        description={`Số liệu từ ${formatDateRange(range.from, range.to)}, so với ${formatDateRange(comparison.from, comparison.to)}. Cập nhật lúc ${formatTime(new Date())}.`}
        actions={
          <DateRangePicker
            preset={preset}
            customRange={customRange}
            onPresetChange={setPreset}
            onCustomRangeChange={setCustomRange}
          />
        }
      />

      <p aria-live="polite" className="sr-only">
        {isRefreshing ? "Đang tải số liệu" : "Đã cập nhật số liệu"}
      </p>

      {data === null ? (
        <DashboardSkeleton />
      ) : (
        <DashboardContent data={data} isRefreshing={isRefreshing} />
      )}
    </div>
  )
}

export default DashboardPage
