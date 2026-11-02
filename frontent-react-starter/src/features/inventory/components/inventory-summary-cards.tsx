import { Boxes, RotateCw } from "lucide-react"
import { Alert } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import { STOCK_STATUS_LABEL } from "../constants"
import { useInventorySummary } from "../queries"
import { STOCK_STATUS_ICON } from "../stock-status-icon"
import type { InventorySummaryParams, StockStatus } from "../types"
import { InventorySummaryCard } from "./inventory-summary-card"

/**
 * Dải thẻ số liệu: tổng và số biến thể theo trạng thái tồn. Bấm thẻ để lọc bảng theo trạng thái đó, bấm "Tất cả"
 * để bỏ lọc. API summary chỉ nhận `categoryId` và `includeHidden`, nên số liệu không theo ô tìm kiếm.
 */
function InventorySummaryCards({
  summaryParams,
  stockStatus,
  searching,
  onSelect,
}: {
  summaryParams: InventorySummaryParams
  stockStatus: StockStatus | undefined
  /** Đang có chữ trong ô tìm kiếm: nhắc rằng thẻ không theo ô này. */
  searching: boolean
  onSelect: (status: StockStatus | undefined) => void
}) {
  const { data, isError, error, isFetching, refetch } = useInventorySummary(summaryParams)

  if (isError && !data) {
    return (
      <Alert variant="danger" title="Không tải được số liệu tồn kho">
        <p>{error.message}</p>
        <Button variant="secondary" size="sm" className="mt-2" loading={isFetching} onClick={() => refetch()}>
          <RotateCw />
          Thử lại
        </Button>
      </Alert>
    )
  }

  const statusCards: { status: StockStatus; value: number | undefined }[] = [
    { status: "in_stock", value: data?.inStock },
    { status: "low", value: data?.low },
    { status: "out", value: data?.out },
  ]

  return (
    <div className="flex flex-col gap-1.5">
      <div role="group" aria-label="Lọc nhanh theo trạng thái tồn" className="grid grid-cols-2 gap-inline lg:grid-cols-4">
        <InventorySummaryCard
          label="Tổng biến thể"
          value={data?.total}
          icon={Boxes}
          pressed={stockStatus === undefined}
          onClick={() => onSelect(undefined)}
        />
        {statusCards.map(({ status, value }) => (
          <InventorySummaryCard
            key={status}
            label={STOCK_STATUS_LABEL[status]}
            value={value}
            icon={STOCK_STATUS_ICON[status]}
            pressed={stockStatus === status}
            onClick={() => onSelect(stockStatus === status ? undefined : status)}
          />
        ))}
      </div>
      {searching ? (
        <p className="text-caption text-ink-muted">
          Số liệu theo danh mục đã chọn và ô "Hiện cả hàng đã ẩn", không theo từ khóa tìm kiếm.
        </p>
      ) : null}
    </div>
  )
}

export { InventorySummaryCards }
