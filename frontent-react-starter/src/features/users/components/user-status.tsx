import { cn } from "@/lib/utils"
import { ACTIVE_LABEL } from "../constants"

/**
 * Trạng thái tài khoản: chấm + chữ, không dùng pill để khỏi lẫn với badge vai trò.
 * Chấm đặc là hoạt động, chấm rỗng là đã khóa — phân biệt bằng hình dạng và
 * nhãn chữ, không dựa vào màu.
 */
function UserStatus({ isActive }: { isActive: boolean }) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 whitespace-nowrap",
        isActive ? "text-ink" : "text-ink-muted",
      )}
    >
      <span
        aria-hidden="true"
        className={cn(
          "size-2 shrink-0 rounded-full border border-ink-muted",
          isActive && "border-ink bg-ink",
        )}
      />
      {isActive ? ACTIVE_LABEL.active : ACTIVE_LABEL.locked}
    </span>
  )
}

export { UserStatus }
