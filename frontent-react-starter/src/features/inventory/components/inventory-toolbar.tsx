import { X } from "lucide-react"
import { CategorySelect } from "@/components/admin/category-select"
import { SearchInput } from "@/components/admin/search-input"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { STOCK_STATUS_LABEL, STOCK_STATUSES } from "../constants"
import type { StockStatus } from "../types"

const ALL = "all"

const STATUS_ITEMS = [
  { value: ALL, label: "Mọi trạng thái tồn" },
  ...STOCK_STATUSES.map((status) => ({ value: status, label: STOCK_STATUS_LABEL[status] })),
]

function InventoryToolbar({
  q,
  categoryId,
  stockStatus,
  includeHidden,
  hasFilters,
  onSearch,
  onCategoryChange,
  onStatusChange,
  onIncludeHiddenChange,
  onClear,
}: {
  q: string
  categoryId: number | undefined
  stockStatus: StockStatus | undefined
  includeHidden: boolean
  hasFilters: boolean
  onSearch: (value: string) => void
  onCategoryChange: (categoryId: number | undefined) => void
  onStatusChange: (status: StockStatus | undefined) => void
  onIncludeHiddenChange: (include: boolean) => void
  onClear: () => void
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex flex-col gap-inline md:flex-row md:flex-wrap md:items-center">
        <SearchInput
          value={q}
          onSearch={onSearch}
          placeholder="Tìm theo tên sản phẩm hoặc SKU"
          label="Tìm biến thể trong kho"
        />

        <CategorySelect
          value={categoryId ?? null}
          onChange={(next) => onCategoryChange(next ?? undefined)}
          allLabel="Mọi danh mục"
          aria-label="Lọc theo danh mục"
          className="sm:w-56"
        />

        <Select
          items={STATUS_ITEMS}
          value={stockStatus ?? ALL}
          onValueChange={(next) => onStatusChange(STOCK_STATUSES.find((status) => status === next))}
        >
          <SelectTrigger aria-label="Lọc theo trạng thái tồn" className="sm:w-48">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {STATUS_ITEMS.map((item) => (
              <SelectItem key={item.value} value={item.value}>
                {item.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <label className="flex w-fit items-center gap-inline text-body-sm text-ink">
          <Checkbox checked={includeHidden} onCheckedChange={(checked) => onIncludeHiddenChange(checked)} />
          Hiện cả hàng đã ẩn
        </label>

        {hasFilters ? (
          <Button variant="ghost" onClick={onClear}>
            <X />
            Xóa bộ lọc
          </Button>
        ) : null}
      </div>
      {categoryId !== undefined ? (
        <p className="text-caption text-ink-muted">Gồm cả biến thể của các danh mục con.</p>
      ) : null}
    </div>
  )
}

export { InventoryToolbar }
