import { useRef } from "react"
import { useCategoryTree } from "@/hooks/use-category-tree"
import { useDocumentTitle } from "@/hooks/use-document-title"
import { useCatalogProducts } from "../queries"
import { useCatalogSearchParams } from "../use-catalog-search-params"
import { ActiveFilterChips } from "./active-filter-chips"
import { CatalogError, CategoryNotFound } from "./catalog-states"
import { CatalogFilters } from "./catalog-filters"
import { CatalogHeading } from "./catalog-heading"
import { CatalogResults } from "./catalog-results"
import { FilterDrawer } from "./filter-drawer"
import { SortSelect } from "./sort-select"
import { PageContainer } from "@/components/storefront/page-container"

/**
 * Trang /products. Đọc bộ lọc từ URL, tra slug danh mục sang id (backend chỉ nhận `categoryId`), gọi danh sách và ghép
 * mọi phần. Slug sai → "Không tìm thấy danh mục" và KHÔNG gọi API sản phẩm; không có `?category=` thì không chờ cây danh mục.
 * `FilterDrawer` luôn được dựng (kể cả lúc đang tải/lỗi/rỗng) để không mất trạng thái mở khi query đổi.
 */
function CatalogContent() {
  const search = useCatalogSearchParams()
  const { tree, isPending: treePending, isError: treeError, refetch } = useCategoryTree()
  const resultsRef = useRef<HTMLElement>(null)

  const slug = search.categorySlug
  const category = slug && tree ? tree.bySlug.get(slug) : undefined
  const categoryMissing = Boolean(slug) && tree !== null && !category
  const categoryUnresolved = Boolean(slug) && tree === null

  const products = useCatalogProducts(search.toListParams(category?.id), {
    enabled: !slug || Boolean(category),
  })

  const title = search.q
    ? `Kết quả cho “${search.q}”`
    : categoryMissing
      ? "Không tìm thấy danh mục"
      : (category?.name ?? "Tất cả sản phẩm")
  useDocumentTitle(categoryUnresolved ? null : title)

  /** Đưa người dùng về đầu danh sách (đổi trang) hoặc đặt lại focus (chip vừa biến mất). */
  const focusResults = () => {
    resultsRef.current?.scrollIntoView({ block: "start" })
    resultsRef.current?.focus({ preventScroll: true })
  }

  if (categoryMissing) {
    return (
      <PageContainer className="pt-8 pb-block lg:pt-12">
        <CategoryNotFound />
      </PageContainer>
    )
  }
  if (categoryUnresolved && treeError) {
    return (
      <PageContainer className="pt-8 pb-block lg:pt-12">
        <CatalogError asPage onRetry={refetch} />
      </PageContainer>
    )
  }

  const total = products.data?.meta.total
  const activeCount = (slug ? 1 : 0) + (search.minPrice !== undefined || search.maxPrice !== undefined ? 1 : 0)
  const filters = <CatalogFilters tree={tree} treePending={treePending} search={search} />

  return (
    <PageContainer className="pt-8 pb-block lg:pt-12">
      <CatalogHeading title={title} total={total} />
      <div className="mt-8 lg:grid lg:grid-cols-[15rem_minmax(0,1fr)] lg:gap-12">
        <aside aria-label="Bộ lọc" className="hidden lg:block">
          <div className="sticky top-[calc(var(--header-h)+2rem)] max-h-[calc(100dvh-var(--header-h)-4rem)] overflow-y-auto pr-2">
            {filters}
          </div>
        </aside>
        <section
          ref={resultsRef}
          aria-label="Kết quả"
          tabIndex={-1}
          className="flex scroll-mt-header flex-col gap-6 outline-none"
        >
          <div className="flex items-center justify-between gap-inline">
            <FilterDrawer activeCount={activeCount} total={total}>
              {filters}
            </FilterDrawer>
            <div className="ml-auto">
              <SortSelect value={search.sort} onChange={search.setSort} />
            </div>
          </div>
          <ActiveFilterChips search={search} categoryName={category?.name} onRemoved={focusResults} />
          <CatalogResults query={products} search={search} onPageNavigate={focusResults} />
        </section>
      </div>
    </PageContainer>
  )
}

export { CatalogContent }
