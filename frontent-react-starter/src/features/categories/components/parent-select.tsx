import { RotateCw } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Skeleton } from "@/components/ui/skeleton"
import { useCategoryOptions } from "@/hooks/use-category-options"
import { buildParentOptions } from "../parent-options"

const ROOT = "root"

/**
 * Ô chọn danh mục cha. Danh sách lấy từ GET /categories (toàn bộ, không phân trang); khi sửa thì
 * loại chính danh mục đó và con cháu của nó. `value` là id cha, `null` = danh mục gốc.
 */
function ParentSelect({
  id,
  value,
  editingId,
  onChange,
  onBlur,
}: {
  id: string
  value: number | null
  /** Id danh mục đang sửa; bỏ trống khi thêm mới. */
  editingId?: number
  onChange: (value: number | null) => void
  onBlur: () => void
}) {
  const { data, isPending, isError, isFetching, refetch } = useCategoryOptions()
  const descriptionId = `${id}-description`

  let control
  if (isPending) {
    control = <Skeleton className="h-control w-full" />
  } else if (isError) {
    control = (
      <Button
        type="button"
        variant="secondary"
        loading={isFetching}
        aria-describedby={descriptionId}
        onClick={() => refetch()}
      >
        <RotateCw />
        Tải lại danh sách danh mục
      </Button>
    )
  } else {
    const items = [
      { value: ROOT, label: "Không có (danh mục gốc)" },
      ...buildParentOptions(data, editingId).map((option) => ({
        value: String(option.value),
        label: option.label,
      })),
    ]
    control = (
      <Select
        items={items}
        value={value === null ? ROOT : String(value)}
        onValueChange={(next) => onChange(next === ROOT ? null : Number(next))}
      >
        <SelectTrigger id={id} aria-describedby={descriptionId} onBlur={onBlur}>
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {items.map((item) => (
            <SelectItem key={item.value} value={item.value}>
              {item.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    )
  }

  return (
    <div className="flex flex-col gap-1.5">
      <Label htmlFor={id}>Danh mục cha</Label>
      {control}
      <p id={descriptionId} className="text-caption text-ink-muted">
        {isError
          ? "Không tải được danh sách danh mục cha. Thử lại, hoặc lưu mà giữ nguyên danh mục cha hiện tại."
          : "Chọn danh mục lớn hơn chứa danh mục này, hoặc để là danh mục gốc."}
      </p>
    </div>
  )
}

export { ParentSelect }
