import type { ReactNode } from "react"
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip"

/**
 * Bọc một nút đang bị khóa để vẫn giải thích được vì sao.
 * Nút `disabled` không nhận hover và không focus được nên tooltip gắn lên một
 * lớp bọc: chuột rê vào hoặc Tab tới đều hiện lời giải thích.
 */
function DisabledAction({
  label,
  reason,
  children,
}: {
  /** Tên hành động, đọc cho trình đọc màn hình. */
  label: string
  reason: string
  children: ReactNode
}) {
  return (
    <Tooltip>
      <TooltipTrigger
        render={
          <span
            role="button"
            tabIndex={0}
            aria-disabled="true"
            aria-label={`${label}. ${reason}`}
            className="inline-flex rounded-xs outline-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
          />
        }
      >
        {children}
      </TooltipTrigger>
      {/* Ghi đè text-xs mặc định của shadcn bằng cỡ chữ của hệ thống. */}
      <TooltipContent className="text-caption">{reason}</TooltipContent>
    </Tooltip>
  )
}

export { DisabledAction }
