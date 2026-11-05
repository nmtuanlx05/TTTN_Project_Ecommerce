import { Heart } from "lucide-react"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

/**
 * Nút trái tim "Yêu thích" của một sản phẩm (thẻ sản phẩm, trang chi tiết, thẻ trong ngăn kéo yêu thích): thuần trình bày, trạng thái và hành động do nơi dùng truyền vào.
 * Nhãn CỐ ĐỊNH ("Yêu thích <tên>") và trạng thái nằm ở `aria-pressed`, nên trình đọc màn hình không đọc lệch khi đổi. Đã chọn thì tim tô đầy. Không đổi kích thước giữa hai trạng thái
 * (không dịch bố cục); `pending` (đang gửi, hoặc danh sách ids chưa tải xong): `aria-busy` + `aria-disabled`, bấm bị bỏ qua, tim nhấp nháy nhẹ (không đổi `opacity` của nút vì thẻ sản phẩm dùng nó để ẩn/hiện khi hover). Cố ý KHÔNG dùng
 * `disabled` (mất focus bàn phím).
 */
function FavoriteButton({
  name,
  favorite,
  pending = false,
  onToggle,
  className,
}: {
  name: string
  favorite: boolean
  pending?: boolean
  onToggle: () => void
  className?: string
}) {
  return (
    <Button
      type="button"
      variant="secondary"
      size="icon"
      aria-label={`Yêu thích ${name}`}
      aria-pressed={favorite}
      aria-busy={pending || undefined}
      aria-disabled={pending || undefined}
      onClick={pending ? undefined : onToggle}
      className={cn("press rounded-4xl aria-disabled:cursor-progress", className)}
    >
      <Heart aria-hidden="true" className={cn(favorite && "fill-current", pending && "motion-safe:animate-pulse")} />
    </Button>
  )
}

export { FavoriteButton }
