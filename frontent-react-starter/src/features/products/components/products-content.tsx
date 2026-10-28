import { useEffect } from "react"
import { Plus, RotateCw, SearchX, Shirt } from "lucide-react"
import { Link, useLocation } from "react-router-dom"
import { TablePagination } from "@/components/admin/table-pagination"
import { Alert } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import { EmptyState } from "@/components/ui/empty-state"
import { listLinkState } from "../list-link"
import { useProducts } from "../queries"
import type { ProductListItem } from "../types"
import type { ProductsSearch } from "../use-products-search-params"
import { ProductsTable } from "./products-table"
import { ProductsTableSkeleton } from "./products-table-skeleton"

/** Phần dưới thanh lọc: tải danh sách rồi chọn skeleton, lỗi, rỗng hoặc bảng kèm phân trang. */
function ProductsContent({
  search,
  pendingId,
  onToggleStatus,
}: {
  search: ProductsSearch
  pendingId: number | undefined
  onToggleStatus: (product: ProductListItem) => void
}) {
  const { data, error, isPending, isError, isPlaceholderData, isFetching, refetch } =
    useProducts(search.params)
  const { search: locationSearch } = useLocation()

  const { page, setPage } = search
  const totalPages = data?.meta.totalPages ?? 0
  const itemCount = data?.items.length ?? 0

  // Trang trên URL vượt quá tổng số trang (tự gõ URL, hoặc dữ liệu vừa ít đi): về trang cuối.
  useEffect(() => {
    if (isPlaceholderData || !data) return
    if (itemCount === 0 && totalPages > 0 && page > totalPages) setPage(totalPages, true)
  }, [data, isPlaceholderData, itemCount, totalPages, page, setPage])

  if (isPending) return <ProductsTableSkeleton />

  if (isError) {
    return (
      <Alert variant="danger" title="Không tải được danh sách sản phẩm">
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
        description="Không có sản phẩm nào khớp với bộ lọc hiện tại. Thử từ khóa ngắn hơn hoặc xóa bộ lọc."
        action={
          <Button variant="secondary" onClick={search.clearFilters}>
            Xóa bộ lọc
          </Button>
        }
      />
    ) : (
      <EmptyState
        icon={Shirt}
        title="Chưa có sản phẩm nào"
        description="Thêm sản phẩm đầu tiên cùng các biến thể size, màu để bắt đầu bán hàng."
        action={
          <Button
            nativeButton={false}
            render={<Link to="/admin/products/new" state={listLinkState(locationSearch)} />}
          >
            <Plus />
            Thêm sản phẩm
          </Button>
        }
      />
    )
  }

  // Trang vượt tổng số trang: effect phía trên đang chuyển về trang cuối.
  if (data.items.length === 0) return <ProductsTableSkeleton />

  return (
    <div className="flex flex-col gap-stack">
      <div
        aria-busy={isPlaceholderData}
        className={isPlaceholderData ? "opacity-60 transition-opacity" : "transition-opacity"}
      >
        <ProductsTable
          products={data.items}
          sortBy={search.sortBy}
          order={search.order}
          pendingId={pendingId}
          onSort={search.toggleSort}
          onToggleStatus={onToggleStatus}
        />
      </div>
      <TablePagination
        meta={data.meta}
        itemCount={itemCount}
        noun="sản phẩm"
        disabled={isPlaceholderData}
        onPageChange={(next) => setPage(next)}
      />
    </div>
  )
}

export { ProductsContent }
