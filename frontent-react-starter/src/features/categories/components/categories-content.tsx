import { useEffect } from "react"
import { FolderTree, Plus, RotateCw, SearchX } from "lucide-react"
import { TablePagination } from "@/components/admin/table-pagination"
import { Alert } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import { EmptyState } from "@/components/ui/empty-state"
import { useCategories } from "../queries"
import type { Category } from "../types"
import type { CategoriesSearch } from "../use-categories-search-params"
import { CategoriesTable, CategoriesTableSkeleton } from "./categories-table"

/** Phần dưới thanh tìm kiếm: tải danh sách rồi chọn skeleton, lỗi, rỗng hoặc bảng kèm phân trang. */
function CategoriesContent({
  search,
  canManage,
  onCreate,
  onEdit,
  onDelete,
}: {
  search: CategoriesSearch
  /** ADMIN: được thêm và xóa. STAFF chỉ xem và sửa. */
  canManage: boolean
  onCreate: () => void
  onEdit: (category: Category) => void
  onDelete: (category: Category) => void
}) {
  const { data, error, isPending, isError, isPlaceholderData, isFetching, refetch } =
    useCategories(search.params)

  const { page, setPage } = search
  const totalPages = data?.meta.totalPages ?? 0
  const itemCount = data?.items.length ?? 0

  // Trang trên URL vượt quá tổng số trang (vừa xóa dòng cuối của trang, hoặc tự gõ URL): về trang cuối.
  useEffect(() => {
    if (isPlaceholderData || !data) return
    if (itemCount === 0 && totalPages > 0 && page > totalPages) setPage(totalPages, true)
  }, [data, isPlaceholderData, itemCount, totalPages, page, setPage])

  if (isPending) return <CategoriesTableSkeleton />

  if (isError) {
    return (
      <Alert variant="danger" title="Không tải được danh sách danh mục">
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
        description="Không có danh mục nào khớp với từ khóa hiện tại. Thử từ khóa ngắn hơn hoặc xóa bộ lọc."
        action={
          <Button variant="secondary" onClick={search.clearFilters}>
            Xóa bộ lọc
          </Button>
        }
      />
    ) : (
      <EmptyState
        icon={FolderTree}
        title="Chưa có danh mục nào"
        description={
          canManage
            ? "Tạo danh mục đầu tiên để sắp xếp sản phẩm cho khách dễ tìm."
            : "Chưa có danh mục nào. Nhờ quản trị viên tạo danh mục, bạn sẽ sửa được chúng tại đây."
        }
        action={
          canManage ? (
            <Button onClick={onCreate}>
              <Plus />
              Thêm danh mục
            </Button>
          ) : undefined
        }
      />
    )
  }

  // Trang vượt tổng số trang: effect phía trên đang chuyển về trang cuối.
  if (data.items.length === 0) return <CategoriesTableSkeleton />

  return (
    <div className="flex flex-col gap-stack">
      <div
        aria-busy={isPlaceholderData}
        className={isPlaceholderData ? "opacity-60 transition-opacity" : "transition-opacity"}
      >
        <CategoriesTable
          categories={data.items}
          sortBy={search.sortBy}
          order={search.order}
          canManage={canManage}
          onSort={search.toggleSort}
          onEdit={onEdit}
          onDelete={onDelete}
        />
      </div>
      <TablePagination
        meta={data.meta}
        itemCount={itemCount}
        noun="danh mục"
        disabled={isPlaceholderData}
        onPageChange={(next) => setPage(next)}
      />
    </div>
  )
}

export { CategoriesContent }
