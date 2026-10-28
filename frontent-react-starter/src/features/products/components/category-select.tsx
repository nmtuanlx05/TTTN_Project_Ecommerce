import { RotateCw } from "lucide-react"
import { useMemo } from "react"
import { Button } from "@/components/ui/button"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Skeleton } from "@/components/ui/skeleton"
import { useCategoryOptions } from "@/hooks/use-category-options"
import { cn } from "@/lib/utils"
import { buildCategoryTreeOptions } from "../category-tree-options"

const NONE = "none"

/** Thụt lề theo độ sâu của cây danh mục (từ cấp 3 trở đi dùng chung một mức). */
const INDENT = ["", "pl-4", "pl-8", "pl-12"] as const

/**
 * Ô chọn danh mục dạng cây thụt lề, dùng cho form (bắt buộc chọn, `placeholder`) và bộ lọc
 * (`allLabel` thêm mục "Mọi danh mục"). Nhận `id`, `aria-*` từ `Field` hoặc từ nơi gọi.
 * `value` là id danh mục, `null` = chưa chọn / mọi danh mục.
 */
function CategorySelect({
  value,
  onChange,
  onBlur,
  placeholder = "Chọn danh mục",
  allLabel,
  className,
  ...triggerProps
}: {
  value: number | null
  onChange: (value: number | null) => void
  onBlur?: () => void
  placeholder?: string
  /** Có thì ô có thêm mục chọn "tất cả" (value `null`), dùng cho bộ lọc. */
  allLabel?: string
  className?: string
  id?: string
  "aria-label"?: string
  "aria-invalid"?: boolean
  "aria-describedby"?: string
}) {
  const { data, isPending, isError, isFetching, refetch } = useCategoryOptions()
  const options = useMemo(() => buildCategoryTreeOptions(data ?? []), [data])

  if (isPending) return <Skeleton className="h-control w-full" />

  if (isError) {
    return (
      <Button type="button" variant="secondary" loading={isFetching} onClick={() => refetch()}>
        <RotateCw />
        Tải lại danh sách danh mục
      </Button>
    )
  }

  // Nhãn của ô đã chọn là đường dẫn đầy đủ ("Áo › Áo thun"); danh sách thả xuống thụt lề theo cấp.
  const items = [
    { value: NONE, label: allLabel ?? placeholder },
    ...options.map((option) => ({ value: String(option.value), label: option.path })),
  ]

  return (
    <Select
      items={items}
      value={value === null ? NONE : String(value)}
      onValueChange={(next) => onChange(next === NONE ? null : Number(next))}
    >
      <SelectTrigger className={className} onBlur={onBlur} {...triggerProps}>
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        {allLabel ? <SelectItem value={NONE}>{allLabel}</SelectItem> : null}
        {options.map((option) => (
          <SelectItem key={option.value} value={String(option.value)}>
            <span className={cn(INDENT[Math.min(option.depth, INDENT.length - 1)])}>
              {option.name}
            </span>
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  )
}

export { CategorySelect }
