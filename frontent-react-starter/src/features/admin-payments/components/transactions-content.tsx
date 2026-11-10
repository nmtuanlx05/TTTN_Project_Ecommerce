import { useEffect } from "react"
import { Landmark, RotateCw } from "lucide-react"
import { TablePagination } from "@/components/admin/table-pagination"
import { Alert } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import { EmptyState } from "@/components/ui/empty-state"
import { useTransactions } from "../queries"
import type { PaymentTransaction } from "../types"
import type { AdminPaymentsSearch } from "../use-admin-payments-search-params"
import { TransactionsTable } from "./transactions-table"
import { TransactionsTableSkeleton } from "./transactions-table-skeleton"

/** Phần dưới thanh lọc: tải danh sách rồi chọn skeleton, lỗi, rỗng hoặc bảng kèm phân trang. */
function TransactionsContent({
  search,
  onConfirm,
  onResolve,
}: {
  search: AdminPaymentsSearch
  onConfirm: (transaction: PaymentTransaction) => void
  onResolve: (transaction: PaymentTransaction) => void
}) {
  const { data, error, isPending, isError, isPlaceholderData, isFetching, refetch } = useTransactions(search.params)
  const { page, setPage } = search
  const totalPages = data?.meta.totalPages ?? 0
  const itemCount = data?.items.length ?? 0

  // Trang trên URL vượt quá tổng số trang (vừa xử lý hết dòng cuối): về trang cuối.
  useEffect(() => {
    if (isPlaceholderData || !data) return
    if (itemCount === 0 && totalPages > 0 && page > totalPages) setPage(totalPages, true)
  }, [data, isPlaceholderData, itemCount, totalPages, page, setPage])

  if (isPending) return <TransactionsTableSkeleton />

  if (isError) {
    return (
      <Alert variant="danger" title="Không tải được danh sách giao dịch">
        <p>{error.message}</p>
        <Button variant="secondary" size="sm" className="mt-2" loading={isFetching} onClick={() => refetch()}>
          <RotateCw />
          Thử lại
        </Button>
      </Alert>
    )
  }

  if (data.meta.total === 0) {
    return (
      <EmptyState
        icon={Landmark}
        title={search.review === "pending" ? "Không có giao dịch nào cần xem lại" : "Chưa có giao dịch nào"}
        description={
          search.review === "pending"
            ? "Mọi khoản chuyển khoản đều đã được khớp hoặc xử lý."
            : "Giao dịch thiếu tiền, không khớp đơn hoặc đến muộn sẽ xuất hiện ở đây."
        }
      />
    )
  }

  // Trang vượt tổng số trang: effect phía trên đang chuyển về trang cuối.
  if (itemCount === 0) return <TransactionsTableSkeleton />

  return (
    <div className="flex flex-col gap-stack">
      <div aria-busy={isPlaceholderData} className={isPlaceholderData ? "opacity-60 transition-opacity" : "transition-opacity"}>
        <TransactionsTable transactions={data.items} onConfirm={onConfirm} onResolve={onResolve} />
      </div>
      <TablePagination
        meta={data.meta}
        itemCount={itemCount}
        noun="giao dịch"
        disabled={isPlaceholderData}
        onPageChange={(next) => setPage(next)}
      />
    </div>
  )
}

export { TransactionsContent }
