import { X } from "lucide-react"
import { SearchInput } from "@/components/admin/search-input"
import { Button } from "@/components/ui/button"

function CategoriesToolbar({
  q,
  hasFilters,
  onSearch,
  onClear,
}: {
  q: string
  hasFilters: boolean
  onSearch: (value: string) => void
  onClear: () => void
}) {
  return (
    <div className="flex flex-col gap-inline md:flex-row md:items-center">
      <SearchInput
        value={q}
        onSearch={onSearch}
        placeholder="Tìm theo tên hoặc slug"
        label="Tìm danh mục"
      />
      {hasFilters ? (
        <Button variant="ghost" onClick={onClear}>
          <X />
          Xóa bộ lọc
        </Button>
      ) : null}
    </div>
  )
}

export { CategoriesToolbar }
