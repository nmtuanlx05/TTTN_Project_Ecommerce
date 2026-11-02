import { Skeleton } from "@/components/ui/skeleton"
import type { CategoryTree } from "@/lib/category-tree"
import type { CatalogSearch } from "../use-catalog-search-params"
import { CategoryFilter } from "./category-filter"
import { PriceFilter } from "./price-filter"

/** Nội dung bộ lọc, dùng chung cho cột bên (desktop) và ngăn kéo (di động). Cây danh mục lỗi/chưa tải thì chỉ còn lọc giá. */
function CatalogFilters({
  tree,
  treePending,
  search,
}: {
  tree: CategoryTree | null
  treePending: boolean
  search: CatalogSearch
}) {
  return (
    <div className="flex flex-col gap-8">
      {tree ? (
        <CategoryFilter roots={tree.roots} search={search} />
      ) : treePending ? (
        <div aria-hidden="true" className="flex flex-col gap-3">
          <Skeleton className="h-4 w-20" />
          <Skeleton className="h-6 w-full" />
          <Skeleton className="h-6 w-4/5" />
          <Skeleton className="h-6 w-3/5" />
        </div>
      ) : null}
      <PriceFilter search={search} />
    </div>
  )
}

export { CatalogFilters }
