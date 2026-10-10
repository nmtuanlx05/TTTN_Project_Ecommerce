import type { ReactNode } from "react"
import { cn } from "@/lib/utils"

/** Đầu mỗi trang quản trị: tiêu đề, mô tả, và một chỗ cho bộ điều khiển. */
function PageHeader({
  title,
  description,
  actions,
  className,
}: {
  title: string
  description?: string
  actions?: ReactNode
  className?: string
}) {
  return (
    <div
      className={cn(
        "flex flex-col gap-stack border-b border-border-subtle pb-stack",
        "md:flex-row md:items-end md:justify-between",
        className,
      )}
    >
      <div className="min-w-0">
        <h1 className="font-display text-h1 uppercase text-ink">{title}</h1>
        {description ? (
          <p className="mt-1 max-w-prose text-body-sm text-ink-muted">{description}</p>
        ) : null}
      </div>
      {actions ? <div className="shrink-0">{actions}</div> : null}
    </div>
  )
}

export { PageHeader }
