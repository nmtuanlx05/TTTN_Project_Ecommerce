import { useEffect, type ReactNode } from "react"
import { RotateCw } from "lucide-react"
import { TablePagination } from "@/components/admin/table-pagination"
import { Alert } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import { useInventory } from "../queries"
import { useInventoryDialog } from "../use-inventory-dialog"
import type { InventorySearch } from "../use-inventory-search-params"
import { InventoryDialogs } from "./inventory-dialogs"
import { InventoryEmptyState } from "./inventory-empty-state"
import { InventoryTable } from "./inventory-table"
import { InventoryTableSkeleton } from "./inventory-table-skeleton"

/**
 * Phần dưới thanh lọc: tải danh sách rồi chọn skeleton, lỗi, rỗng hoặc bảng kèm phân trang. Các hộp thoại
 * nằm NGOÀI nhánh chọn này để đang mở mà danh sách tải lại (vd. sau lỗi 409) thì hộp thoại không bị gỡ.
 */
function InventoryContent({ search }: { search: InventorySearch }) {
  const { data, error, isPending, isError, isPlaceholderData, isFetching, refetch } = useInventory(
    search.params,
  )
  const dialog = useInventoryDialog()

  const { page, setPage } = search
  const totalPages = data?.meta.totalPages ?? 0
  const itemCount = data?.items.length ?? 0

  // Trang trên URL vượt quá tổng số trang (tự gõ URL, hoặc dữ liệu vừa ít đi): về trang cuối.
  useEffect(() => {
    if (isPlaceholderData || !data) return
    if (itemCount === 0 && totalPages > 0 && page > totalPages) setPage(totalPages, true)
  }, [data, isPlaceholderData, itemCount, totalPages, page, setPage])

  const retry = (
    <Button variant="secondary" size="sm" className="mt-2" loading={isFetching} onClick={() => refetch()}>
      <RotateCw />
      Thử lại
    </Button>
  )

  let body: ReactNode
  if (isPending) {
    body = <InventoryTableSkeleton />
  } else if (!data) {
    body = (
      <Alert variant="danger" title="Không tải được danh sách kho">
        <p>{error?.message}</p>
        {retry}
      </Alert>
    )
  } else if (data.items.length === 0 && data.meta.total === 0) {
    body = <InventoryEmptyState filtered={search.hasFilters} onClear={search.clearFilters} />
  } else if (data.items.length === 0) {
    // Trang vượt tổng số trang: effect phía trên đang chuyển về trang cuối.
    body = <InventoryTableSkeleton />
  } else {
    body = (
      <div className="flex flex-col gap-stack">
        {isError ? (
          <Alert variant="warning" title="Chưa làm mới được danh sách">
            <p>{error.message} Bảng đang hiện dữ liệu cũ.</p>
            {retry}
          </Alert>
        ) : null}
        <div
          aria-busy={isPlaceholderData}
          className={isPlaceholderData ? "opacity-60 transition-opacity" : "transition-opacity"}
        >
          <InventoryTable
            items={data.items}
            sortBy={search.sortBy}
            order={search.order}
            onSort={search.toggleSort}
            onOpenDialog={dialog.show}
          />
        </div>
        <TablePagination
          meta={data.meta}
          itemCount={itemCount}
          noun="biến thể"
          disabled={isPlaceholderData}
          onPageChange={(next) => setPage(next)}
        />
      </div>
    )
  }

  return (
    <>
      {body}
      <InventoryDialogs dialog={dialog} items={data?.items ?? []} />
    </>
  )
}

export { InventoryContent }
