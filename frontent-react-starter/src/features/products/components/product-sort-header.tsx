import { ArrowDown, ArrowUp, ArrowUpDown } from "lucide-react"
import { cn } from "@/lib/utils"

/** Tiêu đề cột bấm để sắp xếp. `sorted` lấy từ TanStack Table (`column.getIsSorted()`). */
function ProductSortHeader({
  label,
  sorted,
  alignEnd = false,
  onClick,
}: {
  label: string
  sorted: false | "asc" | "desc"
  alignEnd?: boolean
  onClick: () => void
}) {
  const Icon = sorted === "asc" ? ArrowUp : sorted === "desc" ? ArrowDown : ArrowUpDown
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "-mx-1 inline-flex items-center gap-1 rounded-xs px-1 text-inherit outline-none hover:text-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring",
        alignEnd && "flex-row-reverse",
      )}
    >
      {label}
      <Icon className={sorted ? "size-3 text-ink" : "size-3"} aria-hidden="true" />
    </button>
  )
}

export { ProductSortHeader }
