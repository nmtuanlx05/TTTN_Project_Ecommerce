import { PageHeader } from "@/components/admin/page-header"
import { InventoryContent } from "@/features/inventory/components/inventory-content"
import { InventorySummaryCards } from "@/features/inventory/components/inventory-summary-cards"
import { InventoryToolbar } from "@/features/inventory/components/inventory-toolbar"
import { useInventorySearchParams } from "@/features/inventory/use-inventory-search-params"

function InventoryPage() {
  const search = useInventorySearchParams()

  return (
    <div className="flex flex-col gap-section">
      <PageHeader
        title="Kho"
        description="Nhập kho và theo dõi tồn khả dụng của từng biến thể."
      />

      <div className="flex flex-col gap-stack">
        <InventorySummaryCards
          summaryParams={search.summaryParams}
          stockStatus={search.stockStatus}
          searching={search.q !== ""}
          onSelect={search.setStockStatus}
        />
        <InventoryToolbar
          q={search.q}
          categoryId={search.categoryId}
          stockStatus={search.stockStatus}
          includeHidden={search.includeHidden}
          hasFilters={search.hasFilters}
          onSearch={search.setQuery}
          onCategoryChange={search.setCategory}
          onStatusChange={search.setStockStatus}
          onIncludeHiddenChange={search.setIncludeHidden}
          onClear={search.clearFilters}
        />
        <InventoryContent search={search} />
      </div>
    </div>
  )
}

export default InventoryPage
