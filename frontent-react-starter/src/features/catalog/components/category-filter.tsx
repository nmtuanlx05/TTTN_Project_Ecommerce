import { containsSlug, type CategoryNode } from "@/lib/category-tree"
import type { CatalogSearch } from "../use-catalog-search-params"
import { FilterLink } from "./filter-link"

function Branch({
  nodes,
  activeSlug,
  hrefFor,
}: {
  nodes: CategoryNode[]
  activeSlug: string | undefined
  hrefFor: CatalogSearch["hrefFor"]
}) {
  return (
    <ul>
      {nodes.map((node) => (
        <li key={node.id}>
          <FilterLink to={hrefFor({ category: node.slug })} active={activeSlug === node.slug} indent={node.depth > 0}>
            {node.name}
          </FilterLink>
          {/* Chỉ mở nhánh đang xem cho gọn; các nhánh khác vào qua danh mục cha. */}
          {activeSlug !== undefined && containsSlug(node, activeSlug) && node.children.length > 0 ? (
            <Branch nodes={node.children} activeSlug={activeSlug} hrefFor={hrefFor} />
          ) : null}
        </li>
      ))}
    </ul>
  )
}

/** Cây danh mục. Chọn danh mục cha thì kết quả gồm cả sản phẩm của danh mục con (backend lo), nên có chú thích. */
function CategoryFilter({ roots, search }: { roots: CategoryNode[]; search: CatalogSearch }) {
  return (
    <section aria-labelledby="filter-category" className="flex flex-col gap-2">
      <h2 id="filter-category" className="text-overline uppercase text-ink">
        Danh mục
      </h2>
      <p className="text-body-sm text-ink-muted">Chọn danh mục cha để xem cả sản phẩm của danh mục con.</p>
      <nav aria-labelledby="filter-category">
        <ul>
          <li>
            <FilterLink to={search.hrefFor({ category: undefined })} active={search.categorySlug === undefined}>
              Tất cả
            </FilterLink>
          </li>
        </ul>
        <Branch nodes={roots} activeSlug={search.categorySlug} hrefFor={search.hrefFor} />
      </nav>
    </section>
  )
}

export { CategoryFilter }
