import * as React from "react"
import { cn } from "@/lib/utils"

/**
 * Màn hình rỗng là một lời mời hành động, không phải một lời xin lỗi.
 * Luôn có: nói rõ chưa có gì, và nói người dùng làm gì tiếp theo.
 */
function EmptyState({
  icon: Icon,
  title,
  description,
  action,
  className,
}: {
  icon?: React.ComponentType<{ className?: string }>
  title: string
  description?: string
  action?: React.ReactNode
  className?: string
}) {
  return (
    <div
      data-slot="empty-state"
      className={cn(
        "flex flex-col items-center justify-center gap-stack",
        "rounded-md border border-dashed border-border-default px-card py-section text-center",
        className
      )}
    >
      {Icon ? <Icon className="size-8 text-ink-subtle" /> : null}
      <div className="flex flex-col gap-1">
        <p className="text-h3 font-semibold text-ink">{title}</p>
        {description ? (
          <p className="max-w-prose text-body-sm text-ink-muted">{description}</p>
        ) : null}
      </div>
      {action}
    </div>
  )
}

export { EmptyState }
