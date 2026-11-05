import { useEffect } from "react"
import { RotateCw, SearchX, TicketPercent } from "lucide-react"
import { TablePagination } from "@/components/admin/table-pagination"
import { Alert } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import { EmptyState } from "@/components/ui/empty-state"
import { useVouchers } from "../queries"
import type { Voucher } from "../types"
import type { VouchersSearch } from "../use-vouchers-search-params"
import { VouchersTable } from "./vouchers-table"
import { VouchersTableSkeleton } from "./vouchers-table-skeleton"

/** Phần dưới thanh lọc: tải danh sách rồi chọn skeleton, lỗi, rỗng hoặc bảng kèm phân trang. */
function VouchersContent({
  search,
  togglingId,
  onEdit,
  onToggle,
}: {
  search: VouchersSearch
  togglingId: number | undefined
  onEdit: (voucher: Voucher) => void
  onToggle: (voucher: Voucher, isActive: boolean) => void
}) {
  const { data, error, isPending, isError, isPlaceholderData, isFetching, refetch } =
    useVouchers(search.params)

  const { page, setPage } = search
  const totalPages = data?.meta.totalPages ?? 0
  const itemCount = data?.items.length ?? 0

  // Trang trên URL vượt quá tổng số trang (gõ URL, hoặc lọc làm ít đi): về trang cuối.
  useEffect(() => {
    if (isPlaceholderData || !data) return
    if (itemCount === 0 && totalPages > 0 && page > totalPages) setPage(totalPages, true)
  }, [data, isPlaceholderData, itemCount, totalPages, page, setPage])

  if (isPending) return <VouchersTableSkeleton />

  if (isError) {
    return (
      <Alert variant="danger" title="Không tải được danh sách voucher">
        <p>{error.message}</p>
        <Button variant="secondary" size="sm" className="mt-2" loading={isFetching} onClick={() => refetch()}>
          <RotateCw />
          Thử lại
        </Button>
      </Alert>
    )
  }

  if (data.items.length === 0 && data.meta.total === 0) {
    return search.hasFilters ? (
      <EmptyState
        icon={SearchX}
        title="Không có kết quả khớp"
        description="Không có voucher nào khớp với từ khóa hoặc bộ lọc hiện tại. Thử bỏ bớt điều kiện."
        action={
          <Button variant="secondary" onClick={search.clearFilters}>
            Xóa bộ lọc
          </Button>
        }
      />
    ) : (
      <EmptyState
        icon={TicketPercent}
        title="Chưa có voucher nào"
        description='Bấm "Thêm voucher" để tạo mã giảm giá đầu tiên.'
      />
    )
  }

  // Trang vượt tổng số trang: effect phía trên đang chuyển về trang cuối.
  if (data.items.length === 0) return <VouchersTableSkeleton />

  return (
    <div className="flex flex-col gap-stack">
      <div
        aria-busy={isPlaceholderData}
        className={isPlaceholderData ? "opacity-60 transition-opacity" : "transition-opacity"}
      >
        <VouchersTable
          vouchers={data.items}
          sortBy={search.sortBy}
          order={search.order}
          togglingId={togglingId}
          onSort={search.toggleSort}
          onEdit={onEdit}
          onToggle={onToggle}
        />
      </div>
      <TablePagination
        meta={data.meta}
        itemCount={itemCount}
        noun="voucher"
        disabled={isPlaceholderData}
        onPageChange={(next) => setPage(next)}
      />
    </div>
  )
}

export { VouchersContent }
