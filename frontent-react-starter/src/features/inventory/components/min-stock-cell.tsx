import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip"
import { formatNumber } from "@/lib/format"

/**
 * Ngưỡng cảnh báo. 0 nghĩa là chưa đặt: không bao giờ có "Sắp hết", nên nói rõ bằng tooltip.
 * Trigger là `span` có `tabIndex` để người dùng bàn phím cũng đọc được lời giải thích.
 */
function MinStockCell({ minStock }: { minStock: number }) {
  if (minStock > 0) return <span data-numeric>{formatNumber(minStock)}</span>

  return (
    <Tooltip>
      <TooltipTrigger
        render={
          <span
            tabIndex={0}
            className="rounded-xs text-ink-muted outline-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
          />
        }
      >
        Chưa đặt
      </TooltipTrigger>
      <TooltipContent className="text-caption">
        Cần đặt ngưỡng cảnh báo thì biến thể mới có trạng thái "Sắp hết".
      </TooltipContent>
    </Tooltip>
  )
}

export { MinStockCell }
