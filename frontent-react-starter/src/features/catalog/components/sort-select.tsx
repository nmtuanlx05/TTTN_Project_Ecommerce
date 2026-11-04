import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { SORT_OPTIONS } from "../constants"
import type { CatalogSort } from "../types"

function SortSelect({ value, onChange }: { value: CatalogSort; onChange: (value: CatalogSort) => void }) {
  return (
    <Select items={SORT_OPTIONS} value={value} onValueChange={(next) => onChange(next as CatalogSort)}>
      <SelectTrigger aria-label="Sắp xếp" className="w-44">
        <SelectValue />
      </SelectTrigger>
      <SelectContent className="soft-ui">
        {SORT_OPTIONS.map((option) => (
          <SelectItem key={option.value} value={option.value}>
            {option.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  )
}

export { SortSelect }
