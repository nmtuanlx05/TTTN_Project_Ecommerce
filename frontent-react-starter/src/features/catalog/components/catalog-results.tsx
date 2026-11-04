import type { UseQueryResult } from "@tanstack/react-query"
import { Pagination } from "@/components/storefront/pagination"
import { cn } from "@/lib/utils"
import type { Paginated } from "@/types/api"
import type { CatalogProductListItem } from "../types"
import type { CatalogSearch } from "../use-catalog-search-params"
import {
  CatalogError,
  CategoryEmpty,
  NoMatches,
  PageOutOfRange,
  StoreEmpty,
} from "./catalog-states"
import { ProductGrid } from "./product-grid"
import { ProductGridSkeleton } from "./product-grid-skeleton"

/**
 * Lưới + phân trang + mọi trạng thái của danh sách. Skeleton chỉ ở lần tải đầu (`isPending`); đổi bộ lọc/trang thì giữ
 * lưới cũ, mờ nhẹ (`isPlaceholderData`), không nháy skeleton. Lỗi mà còn dữ liệu cũ thì vẫn hiện dữ liệu cũ.
 */
function CatalogResults({
  query,
  search,
  onPageNavigate,
}: {
  query: UseQueryResult<Paginated<CatalogProductListItem>>
  search: CatalogSearch
  onPageNavigate: () => void
}) {
  const { data } = query
  if (!data) {
    return query.isError ? (
      <CatalogError onRetry={() => void query.refetch()} />
    ) : (
      <ProductGridSkeleton layout="beside-filters" />
    )
  }

  const { items, meta } = data
  if (items.length === 0) {
    if (meta.total > 0) return <PageOutOfRange onFirstPage={() => search.setPage(1)} />
    const onlyCategory = search.categorySlug !== undefined && !search.q && search.minPrice === undefined && search.maxPrice === undefined
    if (onlyCategory) return <CategoryEmpty />
    return search.hasFilters ? <NoMatches onClear={search.clearFilters} /> : <StoreEmpty />
  }

  return (
    <div className="flex flex-col gap-12">
      <div
        aria-busy={query.isPlaceholderData}
        className={cn(
          "transition-opacity duration-(--motion-base) ease-smooth",
          query.isPlaceholderData && "opacity-60",
        )}
      >
        <ProductGrid products={items} layout="beside-filters" quickActions />
      </div>
      <Pagination
        page={meta.page}
        totalPages={meta.totalPages}
        hrefFor={(page) => search.hrefFor({ page: page > 1 ? String(page) : undefined }, { resetPage: false })}
        onNavigate={onPageNavigate}
      />
    </div>
  )
}

export { CatalogResults }
