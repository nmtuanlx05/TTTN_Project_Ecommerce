import { Minus, Plus, RotateCcw } from "lucide-react"
import { Button } from "@/components/ui/button"

/**
 * Thanh thu phóng của lightbox: −, phần trăm hiện tại, +, Đặt lại. Phần trăm là vùng `aria-live`
 * nên mỗi lần đổi mức zoom được đọc lên. Nằm trong "đảo tối" của lightbox nên dùng được Button như thường.
 */
function ImageLightboxToolbar({
  percent,
  disabled,
  canZoomIn,
  canZoomOut,
  isDefaultView,
  onZoomIn,
  onZoomOut,
  onReset,
}: {
  percent: number
  /** Ảnh chưa tải xong hoặc lỗi: chưa thu phóng được. */
  disabled: boolean
  canZoomIn: boolean
  canZoomOut: boolean
  isDefaultView: boolean
  onZoomIn: () => void
  onZoomOut: () => void
  onReset: () => void
}) {
  return (
    <div
      role="toolbar"
      aria-label="Thu phóng ảnh"
      className="absolute bottom-4 left-1/2 z-10 flex -translate-x-1/2 items-center gap-1 rounded-md border border-border-default bg-surface-raised p-1"
    >
      <Button
        type="button"
        variant="ghost"
        size="icon"
        aria-label="Thu nhỏ"
        title="Thu nhỏ (−)"
        disabled={disabled || !canZoomOut}
        onClick={onZoomOut}
      >
        <Minus />
      </Button>
      <span
        role="status"
        aria-live="polite"
        aria-label={`Mức thu phóng ${percent}%`}
        data-numeric
        className="min-w-14 text-center text-body-sm text-ink"
      >
        {percent}%
      </span>
      <Button
        type="button"
        variant="ghost"
        size="icon"
        aria-label="Phóng to"
        title="Phóng to (+)"
        disabled={disabled || !canZoomIn}
        onClick={onZoomIn}
      >
        <Plus />
      </Button>
      <Button
        type="button"
        variant="ghost"
        disabled={disabled || isDefaultView}
        title="Đặt lại, vừa khung (0)"
        onClick={onReset}
      >
        <RotateCcw />
        Đặt lại
      </Button>
    </div>
  )
}

export { ImageLightboxToolbar }
