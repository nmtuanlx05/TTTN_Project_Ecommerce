import { X } from "lucide-react"
import { SearchInput } from "@/components/admin/search-input"
import { Button } from "@/components/ui/button"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { VISIBILITY_LABEL } from "../constants"
import { CategorySelect } from "./category-select"

const ALL = "all"

const STATUS_ITEMS = [
  { value: ALL, label: "Mọi trạng thái" },
  { value: "true", label: VISIBILITY_LABEL.visible },
  { value: "false", label: VISIBILITY_LABEL.hidden },
]

function ProductsToolbar({
  q,
  categoryId,
  isActive,
  hasFilters,
  onSearch,
  onCategoryChange,
  onActiveChange,
  onClear,
}: {
  q: string
  categoryId: number | undefined
  isActive: boolean | undefined
  hasFilters: boolean
  onSearch: (value: string) => void
  onCategoryChange: (categoryId: number | undefined) => void
  onActiveChange: (isActive: boolean | undefined) => void
  onClear: () => void
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex flex-col gap-inline md:flex-row md:items-center">
        <SearchInput
          value={q}
          onSearch={onSearch}
          placeholder="Tìm theo tên hoặc slug"
          label="Tìm sản phẩm"
        />

        <div className="flex flex-col gap-inline sm:flex-row sm:items-center">
          <CategorySelect
            value={categoryId ?? null}
            onChange={(next) => onCategoryChange(next ?? undefined)}
            allLabel="Mọi danh mục"
            aria-label="Lọc theo danh mục"
            className="sm:w-56"
          />

          <Select
            items={STATUS_ITEMS}
            value={isActive === undefined ? ALL : String(isActive)}
            onValueChange={(next) => onActiveChange(next === ALL ? undefined : next === "true")}
          >
            <SelectTrigger aria-label="Lọc theo trạng thái" className="sm:w-44">
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

          {hasFilters ? (
            <Button variant="ghost" onClick={onClear}>
              <X />
              Xóa bộ lọc
            </Button>
          ) : null}
        </div>
      </div>
      {categoryId !== undefined ? (
        <p className="text-caption text-ink-muted">
          Chỉ hiện sản phẩm thuộc đúng danh mục đã chọn, không gồm sản phẩm của danh mục con.
        </p>
      ) : null}
    </div>
  )
}

export { ProductsToolbar }
