import { useEffect } from "react"
import { ReceiptText, RotateCw, SearchX } from "lucide-react"
import { TablePagination } from "@/components/admin/table-pagination"
import { Alert } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import { EmptyState } from "@/components/ui/empty-state"
import { useAdminOrders } from "../queries"
import type { AdminOrdersSearch } from "../use-admin-orders-search-params"
import { OrdersTable } from "./orders-table"
import { OrdersTableSkeleton } from "./orders-table-skeleton"

/** Phần dưới thanh lọc: skeleton, lỗi có nút thử lại, rỗng (và rỗng theo bộ lọc), hoặc bảng kèm phân trang. */
function OrdersContent({ search }: { search: AdminOrdersSearch }) {
  const { data, error, isPending, isError, isPlaceholderData, isFetching, refetch } = useAdminOrders(search.params)

  const { page, setPage } = search
  const totalPages = data?.meta.totalPages ?? 0
  const itemCount = data?.items.length ?? 0

  // Trang trên URL vượt tổng số trang (tự gõ URL, hoặc dữ liệu vừa ít đi): về trang cuối.
  useEffect(() => {
    if (isPlaceholderData || !data) return
    if (itemCount === 0 && totalPages > 0 && page > totalPages) setPage(totalPages, true)
  }, [data, isPlaceholderData, itemCount, totalPages, page, setPage])

  if (isPending) return <OrdersTableSkeleton />

  if (isError) {
    return (
      <Alert variant="danger" title="Không tải được danh sách đơn hàng">
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
        title="Không có đơn nào khớp"
        description="Không có đơn hàng nào khớp với bộ lọc hiện tại. Thử từ khóa ngắn hơn, đổi khoảng ngày hoặc xóa bộ lọc."
        action={
          <Button variant="secondary" onClick={search.clearFilters}>
            Xóa bộ lọc
          </Button>
        }
      />
    ) : (
      <EmptyState
        icon={ReceiptText}
        title="Chưa có đơn hàng nào"
        description="Đơn hàng sẽ xuất hiện ở đây ngay khi khách đặt hàng."
      />
    )
  }

  // Trang vượt tổng số trang: effect phía trên đang chuyển về trang cuối.
  if (data.items.length === 0) return <OrdersTableSkeleton />

  return (
    <div className="flex flex-col gap-stack">
      <div
        aria-busy={isPlaceholderData}
        className={isPlaceholderData ? "opacity-60 transition-opacity" : "transition-opacity"}
      >
        <OrdersTable orders={data.items} />
      </div>
      <TablePagination
        meta={data.meta}
        itemCount={itemCount}
        noun="đơn hàng"
        disabled={isPlaceholderData}
        onPageChange={(next) => setPage(next)}
      />
    </div>
  )
}

export { OrdersContent }
