import { PRICE_RANGES } from "../constants"
import type { CatalogSearch } from "../use-catalog-search-params"
import { FilterLink } from "./filter-link"

/** Khoảng giá chọn nhanh. Giá tùy ý trên URL không khớp khoảng nào: không mục nào được chọn, chip bên trên vẫn hiện nó. */
function PriceFilter({ search }: { search: CatalogSearch }) {
  const { minPrice, maxPrice, hrefFor } = search
  return (
    <section aria-labelledby="filter-price" className="flex flex-col gap-2">
      <h2 id="filter-price" className="text-overline uppercase text-ink">
        Khoảng giá
      </h2>
      <ul>
        <li>
          <FilterLink
            to={hrefFor({ minPrice: undefined, maxPrice: undefined })}
            active={minPrice === undefined && maxPrice === undefined}
          >
            Mọi mức giá
          </FilterLink>
        </li>
        {PRICE_RANGES.map((range) => (
          <li key={range.id}>
            <FilterLink
              to={hrefFor({
                minPrice: range.min === undefined ? undefined : String(range.min),
                maxPrice: range.max === undefined ? undefined : String(range.max),
              })}
              active={range.min === minPrice && range.max === maxPrice}
            >
              {range.label}
            </FilterLink>
          </li>
        ))}
      </ul>
    </section>
  )
}

export { PriceFilter }
