import { displayName, initialsOf } from "@/lib/display-name"
import { cn } from "@/lib/utils"

/**
 * Chữ cái đầu hiện trong khung tròn khi chưa có ảnh đại diện hoặc ảnh không tải được. Dùng làm `fallback` của
 * `ImagePreview` / `ImageUploadField`, nên cỡ chữ do nơi gọi đặt qua `className`.
 *
 * `decorative`: bỏ khỏi cây truy cập khi bên cạnh đã có tên bằng chữ (cột bảng), tránh trình đọc màn hình đọc lặp.
 */
function AvatarInitials({
  name,
  email,
  decorative = false,
  className,
}: {
  name: string | null
  email: string
  decorative?: boolean
  className?: string
}) {
  return (
    <span
      {...(decorative
        ? { "aria-hidden": true }
        : { role: "img", "aria-label": `Ảnh đại diện của ${displayName({ name, email })}` })}
      className={cn("font-medium text-ink select-none", className)}
    >
      {initialsOf({ name, email })}
    </span>
  )
}

export { AvatarInitials }
