import { X } from "lucide-react"
import { Button } from "@/components/ui/button"
import { formatVnd } from "@/lib/format"
import { PRICE_RANGES } from "../constants"
import type { CatalogSearch } from "../use-catalog-search-params"

/** Nhãn khoảng giá: khoảng nhanh thì dùng nhãn của nó, giá tùy ý trên URL thì tự ghép ("Từ …", "Đến …", "… – …"). */
function priceRangeLabel(min: number | undefined, max: number | undefined): string {
  const preset = PRICE_RANGES.find((range) => range.min === min && range.max === max)
  if (preset) return preset.label
  if (min !== undefined && max !== undefined) return `${formatVnd(min)} – ${formatVnd(max)}`
  if (min !== undefined) return `Từ ${formatVnd(min)}`
  return `Đến ${formatVnd(max ?? 0)}`
}

/**
 * Chip các bộ lọc đang áp dụng: bấm để bỏ, kèm "Xóa tất cả". `onRemoved` gọi sau khi bỏ một chip (chip biến mất nên
 * focus phải được đưa đi đâu đó: về vùng kết quả).
 */
function ActiveFilterChips({
  search,
  categoryName,
  onRemoved,
}: {
  search: CatalogSearch
  categoryName: string | undefined
  onRemoved: () => void
}) {
  const hasPrice = search.minPrice !== undefined || search.maxPrice !== undefined
  const chips = [
    categoryName ? { key: "category", label: `Danh mục: ${categoryName}`, remove: () => search.setCategory(undefined) } : null,
    search.q ? { key: "q", label: `Từ khóa: “${search.q}”`, remove: search.clearQuery } : null,
    hasPrice
      ? {
          key: "price",
          label: `Giá: ${priceRangeLabel(search.minPrice, search.maxPrice)}`,
          remove: () => search.setPriceRange(undefined, undefined),
        }
      : null,
  ].filter((chip) => chip !== null)

  if (chips.length === 0) return null

  return (
    <div className="flex flex-wrap items-center gap-2">
      <ul aria-label="Bộ lọc đang áp dụng" className="flex flex-wrap items-center gap-2">
        {chips.map((chip) => (
          <li key={chip.key}>
            <button
              type="button"
              aria-label={`Bỏ lọc ${chip.label}`}
              onClick={() => {
                chip.remove()
                onRemoved()
              }}
              className="press inline-flex min-h-control items-center gap-2 rounded-4xl border border-border-control px-4 text-body-sm text-ink transition-colors duration-(--motion-fast) ease-smooth hover:bg-surface-hover"
            >
              {chip.label}
              <X className="size-4" aria-hidden="true" />
            </button>
          </li>
        ))}
      </ul>
      <Button
        variant="ghost"
        onClick={() => {
          search.clearFilters()
          onRemoved()
        }}
      >
        Xóa tất cả
      </Button>
    </div>
  )
}

export { ActiveFilterChips }
