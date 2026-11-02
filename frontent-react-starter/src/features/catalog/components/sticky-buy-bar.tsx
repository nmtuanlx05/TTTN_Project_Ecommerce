import { Button } from "@/components/ui/button"
import { formatVnd } from "@/lib/format"
import { cn } from "@/lib/utils"

/**
 * Thanh mua dính đáy màn hình (chỉ di động). `visible` do nơi dùng quyết (nút chính đã cuộn lên khỏi màn hình). Ẩn thì
 * `inert`: không nhận focus, không bị đọc. Đệm dưới theo `env(safe-area-inset-bottom)` (tai thỏ/thanh home; chỉ có tác dụng
 * khi trang đặt `viewport-fit=cover`).
 *
 * Thanh này được render vào "ô gắn" `sticky bottom-0 h-0` ở cuối trang chi tiết (xem `ProductDetailContent`) chứ không dùng
 * `fixed`: ô gắn dính đáy màn hình khi cuộn và dừng lại ở cuối nội dung, nên thanh không bao giờ che chân trang. Thanh
 * mọc ngược lên từ ô gắn (`absolute bottom-0`) và tràn hai bên lề trang (`-inset-x-gutter`).
 */
function StickyBuyBar({
  visible,
  price,
  variantLabel,
  soldOut,
  onAdd,
}: {
  visible: boolean
  price: number
  /** "Màu · Size" đang chọn. */
  variantLabel: string
  soldOut: boolean
  onAdd: () => void
}) {
  return (
    <div
      inert={!visible}
      className={cn(
        "absolute -inset-x-gutter bottom-0 border-t border-border-default bg-canvas md:hidden",
        "transition-[transform,opacity] duration-(--motion-base) ease-smooth",
        visible ? "translate-y-0 opacity-100" : "pointer-events-none translate-y-full opacity-0",
      )}
    >
      <div className="flex items-center gap-inline px-gutter pt-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
        <div className="flex min-w-0 flex-1 flex-col">
          <span className="text-body-sm font-semibold text-ink">{formatVnd(price)}</span>
          <span className="truncate text-body-sm text-ink-muted">{variantLabel}</span>
        </div>
        <Button size="lg" disabled={soldOut} onClick={onAdd} className="press shrink-0">
          {soldOut ? "Hết hàng" : "Thêm vào giỏ"}
        </Button>
      </div>
    </div>
  )
}

export { StickyBuyBar }
