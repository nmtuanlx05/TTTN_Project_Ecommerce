import { displayName } from "@/lib/display-name"
import { cn } from "@/lib/utils"
import { AvatarInitials } from "./avatar-initials"
import { ImagePreview } from "./image-preview"

const SIZE = {
  /** Nút mở menu tài khoản. */
  sm: { box: "size-6", text: "text-caption" },
  /** Cột tên trong bảng người dùng. */
  md: { box: "size-8", text: "text-body-sm" },
} as const

/**
 * Ảnh đại diện tròn. Chỉ là lớp mỏng trên `ImagePreview` (shape="circle"): không có ảnh hoặc ảnh lỗi thì
 * `ImagePreview` tự chuyển sang chữ cái đầu của tên, không có logic tải ảnh nào ở đây.
 *
 * `name` có thể `null` (dữ liệu cũ): chữ cái đầu và alt lấy theo `displayName`/`initialsOf`.
 * `decorative`: dùng khi tên đã hiện bằng chữ ngay cạnh, ảnh thành trang trí (alt rỗng).
 */
function UserAvatar({
  avatarUrl,
  name,
  email,
  size = "md",
  decorative = false,
  className,
}: {
  avatarUrl: string | null
  name: string | null
  email: string
  size?: keyof typeof SIZE
  decorative?: boolean
  className?: string
}) {
  return (
    <ImagePreview
      src={avatarUrl}
      alt={decorative ? "" : `Ảnh đại diện của ${displayName({ name, email })}`}
      shape="circle"
      className={cn(SIZE[size].box, className)}
      fallback={
        <AvatarInitials name={name} email={email} decorative={decorative} className={SIZE[size].text} />
      }
    />
  )
}

export { UserAvatar }
