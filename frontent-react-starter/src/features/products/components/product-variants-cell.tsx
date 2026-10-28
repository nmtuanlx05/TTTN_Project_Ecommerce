import { TriangleAlert } from "lucide-react"
import { cn } from "@/lib/utils"

/**
 * "6/8 đang bán". Không còn biến thể nào đang bán thì cảnh báo, vì khách không thấy sản phẩm
 * dù nó đang ở trạng thái hiện.
 */
function ProductVariantsCell({ active, total }: { active: number; total: number }) {
  const noneSelling = active === 0
  return (
    <span
      data-numeric
      className={cn(
        "inline-flex items-center gap-1 whitespace-nowrap",
        noneSelling && "text-warning-fg",
      )}
      title={noneSelling ? "Chưa có biến thể nào đang bán nên khách chưa thấy sản phẩm này" : undefined}
    >
      {noneSelling ? <TriangleAlert className="size-3.5" aria-hidden="true" /> : null}
      {active}/{total} đang bán
    </span>
  )
}

export { ProductVariantsCell }
