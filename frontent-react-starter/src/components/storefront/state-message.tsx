import type { ComponentProps, ReactNode } from "react"
import { EmptyState } from "@/components/ui/empty-state"
import { cn } from "@/lib/utils"

/**
 * Trạng thái rỗng / lỗi / không tìm thấy của storefront: `EmptyState` bỏ khung nét đứt (đường kẻ mảnh của trang đã đủ),
 * luôn nói rõ chuyện gì xảy ra và người dùng làm gì tiếp (`action`).
 */
function StateMessage({
  icon,
  title,
  description,
  action,
  className,
}: {
  icon: ComponentProps<typeof EmptyState>["icon"]
  title: string
  description?: string
  action?: ReactNode
  className?: string
}) {
  return (
    <EmptyState
      icon={icon}
      title={title}
      description={description}
      action={action}
      className={cn("border-0 py-block", className)}
    />
  )
}

export { StateMessage }
