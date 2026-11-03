import type { ComponentType, ReactNode } from "react"
import { cn } from "@/lib/utils"

/**
 * Trạng thái rỗng / lỗi / không tìm thấy của storefront: icon, tiêu đề, mô tả, hành động tiếp theo; không khung nét đứt (đường kẻ
 * mảnh của trang đã đủ). Luôn nói chuyện gì xảy ra và người dùng làm gì tiếp.
 *
 * `titleAs="h1"` cho trạng thái chiếm CẢ TRANG (404, không tìm thấy sản phẩm/danh mục), để trang vẫn có đúng một `h1`; trạng thái
 * nằm trong một trang đã có `h1` (danh sách rỗng, khối lỗi) giữ `p`.
 */
function StateMessage({
  icon: Icon,
  title,
  titleAs: Title = "p",
  description,
  action,
  className,
}: {
  icon: ComponentType<{ className?: string }>
  title: string
  titleAs?: "p" | "h1"
  description?: string
  action?: ReactNode
  className?: string
}) {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center gap-stack px-card py-block text-center",
        className,
      )}
    >
      <Icon className="size-8 text-ink-subtle" aria-hidden="true" />
      <div className="flex flex-col gap-1">
        <Title className="text-h3 font-semibold text-ink">{title}</Title>
        {description ? <p className="max-w-prose text-body-sm text-ink-muted">{description}</p> : null}
      </div>
      {action}
    </div>
  )
}

export { StateMessage }
