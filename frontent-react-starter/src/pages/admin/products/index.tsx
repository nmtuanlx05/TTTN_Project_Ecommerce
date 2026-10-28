import { Plus } from "lucide-react"
import { Link, useLocation } from "react-router-dom"
import { PageHeader } from "@/components/admin/page-header"
import { Button } from "@/components/ui/button"
import { ProductsContent } from "@/features/products/components/products-content"
import { ProductStatusDialog } from "@/features/products/components/product-status-dialog"
import { ProductsToolbar } from "@/features/products/components/products-toolbar"
import { listLinkState } from "@/features/products/list-link"
import { useProductStatusAction } from "@/features/products/use-product-status-action"
import { useProductsSearchParams } from "@/features/products/use-products-search-params"

function ProductsPage() {
  const search = useProductsSearchParams()
  const status = useProductStatusAction()
  const { search: locationSearch } = useLocation()

  return (
    <div className="flex flex-col gap-section">
      <PageHeader
        title="Sản phẩm"
        description="Quản lý sản phẩm và các biến thể theo size, màu."
        actions={
          <Button
            nativeButton={false}
            render={<Link to="/admin/products/new" state={listLinkState(locationSearch)} />}
          >
            <Plus />
            Thêm sản phẩm
          </Button>
        }
      />

      <div className="flex flex-col gap-stack">
        <ProductsToolbar
          q={search.q}
          categoryId={search.categoryId}
          isActive={search.isActive}
          hasFilters={search.hasFilters}
          onSearch={search.setQuery}
          onCategoryChange={search.setCategory}
          onActiveChange={search.setActive}
          onClear={search.clearFilters}
        />
        <ProductsContent
          search={search}
          pendingId={status.pendingId}
          onToggleStatus={status.request}
        />
      </div>

      <ProductStatusDialog {...status.dialogProps} />
    </div>
  )
}

export default ProductsPage
