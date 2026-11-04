import { formatVnd } from "@/lib/format"
import { FREE_SHIPPING_THRESHOLD } from "@/lib/store-info"
import { cn } from "@/lib/utils"

/**
 * Dải miễn phí vận chuyển: thanh tiến trình theo `subtotal` so với `FREE_SHIPPING_THRESHOLD` (cùng hằng số với thanh thông báo). Đủ mức thì thanh đầy và đổi câu.
 * Dùng ở ngăn kéo và thẻ tóm tắt trang giỏ. CHƯA có phí vận chuyển thật ở backend (docs/storefront-design.md mục 13).
 */
function FreeShippingBar({ subtotal, className }: { subtotal: number; className?: string }) {
  const reached = subtotal >= FREE_SHIPPING_THRESHOLD
  const value = Math.min(subtotal, FREE_SHIPPING_THRESHOLD)

  return (
    <div className={cn("flex flex-col gap-2", className)}>
      <p className="text-caption text-ink">
        {reached
          ? "Đơn hàng của bạn được miễn phí vận chuyển"
          : `Mua thêm ${formatVnd(FREE_SHIPPING_THRESHOLD - subtotal)} để được miễn phí vận chuyển`}
      </p>
      <div
        role="progressbar"
        aria-label="Tiến độ miễn phí vận chuyển"
        aria-valuemin={0}
        aria-valuemax={FREE_SHIPPING_THRESHOLD}
        aria-valuenow={value}
        aria-valuetext={`${formatVnd(value)} trên ${formatVnd(FREE_SHIPPING_THRESHOLD)}`}
        className="h-1.5 overflow-hidden rounded-4xl bg-border-subtle"
      >
        <div
          className="h-full rounded-4xl bg-ink transition-[width] duration-(--motion-slow) ease-smooth"
          style={{ width: `${(value / FREE_SHIPPING_THRESHOLD) * 100}%` }}
        />
      </div>
    </div>
  )
}

export { FreeShippingBar }
