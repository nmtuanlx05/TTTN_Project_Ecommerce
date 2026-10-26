import { useEffect } from "react"
import { RotateCw, SearchX, UserRoundX } from "lucide-react"
import { TablePagination } from "@/components/admin/table-pagination"
import { Alert } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import { EmptyState } from "@/components/ui/empty-state"
import { useUsers } from "../queries"
import type { User } from "@/types/user"
import type { UsersSearch } from "../use-users-search-params"
import { UsersTable, UsersTableSkeleton } from "./users-table"

/** Phần dưới thanh lọc: tải danh sách rồi chọn skeleton, lỗi, rỗng hoặc bảng kèm phân trang. */
function UsersContent({
  search,
  togglingId,
  onEdit,
  onToggleStatus,
}: {
  search: UsersSearch
  togglingId: number | undefined
  onEdit: (user: User) => void
  onToggleStatus: (user: User) => void
}) {
  const { data, error, isPending, isError, isPlaceholderData, isFetching, refetch } =
    useUsers(search.params)

  const { page, setPage } = search
  const totalPages = data?.meta.totalPages ?? 0
  const itemCount = data?.items.length ?? 0

  // Trang trên URL vượt quá tổng số trang (xóa bớt, hoặc tự gõ URL): về trang cuối.
  useEffect(() => {
    if (isPlaceholderData || !data) return
    if (itemCount === 0 && totalPages > 0 && page > totalPages) setPage(totalPages, true)
  }, [data, isPlaceholderData, itemCount, totalPages, page, setPage])

  if (isPending) return <UsersTableSkeleton />

  if (isError) {
    return (
      <Alert variant="danger" title="Không tải được danh sách người dùng">
        <p>{error.message}</p>
        <Button
          variant="secondary"
          size="sm"
          className="mt-2"
          loading={isFetching}
          onClick={() => refetch()}
        >
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
        description="Không có người dùng nào khớp với từ khóa hoặc bộ lọc hiện tại. Thử bỏ bớt điều kiện."
        action={
          <Button variant="secondary" onClick={search.clearFilters}>
            Xóa bộ lọc
          </Button>
        }
      />
    ) : (
      <EmptyState
        icon={UserRoundX}
        title="Chưa có người dùng nào"
        description="Tài khoản khách hàng và nhân viên sẽ hiện ở đây sau khi được tạo."
      />
    )
  }

  // Trang vượt tổng số trang: effect phía trên đang chuyển về trang cuối.
  if (data.items.length === 0) return <UsersTableSkeleton />

  return (
    <div className="flex flex-col gap-stack">
      <div
        aria-busy={isPlaceholderData}
        className={isPlaceholderData ? "opacity-60 transition-opacity" : "transition-opacity"}
      >
        <UsersTable
          users={data.items}
          sortBy={search.sortBy}
          order={search.order}
          togglingId={togglingId}
          onSort={search.toggleSort}
          onEdit={onEdit}
          onToggleStatus={onToggleStatus}
        />
      </div>
      <TablePagination
        meta={data.meta}
        itemCount={itemCount}
        noun="người dùng"
        disabled={isPlaceholderData}
        onPageChange={(next) => setPage(next)}
      />
    </div>
  )
}

export { UsersContent }
