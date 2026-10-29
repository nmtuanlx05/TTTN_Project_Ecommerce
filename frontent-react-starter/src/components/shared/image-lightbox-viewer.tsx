import { useState } from "react"
import { Dialog } from "@base-ui/react/dialog"
import { ImageOff, LoaderCircle, X } from "lucide-react"
import { Button } from "@/components/ui/button"
import { usePanZoom } from "@/hooks/use-pan-zoom"
import { usePanZoomGestures } from "@/hooks/use-pan-zoom-gestures"
import { cn } from "@/lib/utils"
import { ImageLightboxToolbar } from "./image-lightbox-toolbar"

/**
 * Nội dung của lightbox: khung nhìn, ảnh, trạng thái tải/lỗi, nút Đóng và thanh thu phóng. Nằm bên trong
 * `Dialog.Popup` nên chỉ mount khi mở: mỗi lần mở là mức zoom và vị trí mới.
 *
 * - Nút Đóng đứng đầu trong DOM nên nhận focus đầu tiên khi mở (Base UI khóa focus trong dialog).
 * - Khung nhìn phủ cả màn hình (để bấm vùng trống đóng được) nhưng chừa lề trên/dưới cho nút điều khiển,
 *   nên ở mức vừa khung ảnh không bị nút che.
 * - Ảnh đang tải vẫn được render (trong suốt) để có kích thước gốc tính mức "vừa khung".
 */
function ImageLightboxViewer({
  src,
  alt,
  onClose,
}: {
  src: string
  alt: string
  onClose: () => void
}) {
  const [natural, setNatural] = useState<{ src: string; width: number; height: number } | null>(null)
  const [failedSrc, setFailedSrc] = useState<string | null>(null)
  const failed = failedSrc === src
  const ready = natural?.src === src && !failed
  const [stageEl, setStageEl] = useState<HTMLDivElement | null>(null)
  const zoom = usePanZoom({ stageEl, naturalSize: ready ? natural : null })
  const gestures = usePanZoomGestures({
    update: zoom.update,
    scale: zoom.view.scale,
    onTapOutside: onClose,
  })
  const { scale, x, y } = zoom.view

  return (
    // Phím tắt nghe ở đây: sự kiện từ nút đang focus trong dialog nổi lên tới đây.
    <div className="absolute inset-0" onKeyDown={zoom.handleKeyDown}>
      <Dialog.Close
        render={
          <Button
            type="button"
            variant="secondary"
            size="icon"
            aria-label="Đóng ảnh"
            title="Đóng (Esc)"
            className="absolute top-4 right-4 z-10"
          />
        }
      >
        <X />
      </Dialog.Close>

      <div
        ref={setStageEl}
        onPointerDown={gestures.onPointerDown}
        onPointerMove={gestures.onPointerMove}
        onPointerUp={gestures.onPointerUp}
        onPointerCancel={gestures.onPointerCancel}
        className="absolute inset-0 flex touch-none items-center justify-center overflow-hidden px-4 pt-16 pb-24 select-none"
      >
        {failed ? (
          <div role="alert" className="flex flex-col items-center gap-2 text-center text-ink-muted">
            <ImageOff className="size-8" aria-hidden="true" />
            <p className="text-body font-medium text-ink">Không tải được ảnh</p>
            <p className="max-w-prose text-body-sm">
              Đường dẫn ảnh có thể đã hỏng hoặc ảnh không còn nữa. Bấm Đóng hoặc nhấn Esc để thoát.
            </p>
          </div>
        ) : (
          <img
            data-pan-zoom-content
            src={src}
            alt={alt}
            draggable={false}
            onLoad={(event) => {
              const { naturalWidth, naturalHeight } = event.currentTarget
              if (naturalWidth > 0 && naturalHeight > 0) {
                setNatural({ src, width: naturalWidth, height: naturalHeight })
              } else {
                setFailedSrc(src)
              }
            }}
            onError={() => setFailedSrc(src)}
            style={
              ready
                ? {
                    width: zoom.fitSize.width,
                    height: zoom.fitSize.height,
                    transform: `translate3d(${x}px, ${y}px, 0) scale(${scale})`,
                  }
                : undefined
            }
            className={cn(
              "shrink-0 will-change-transform",
              ready
                ? "max-h-none max-w-none"
                : "pointer-events-none max-h-full max-w-full opacity-0",
              ready && (scale > 1 ? "cursor-grab active:cursor-grabbing" : "cursor-zoom-in"),
              ready && zoom.smooth && "transition-transform duration-150",
            )}
          />
        )}
        {!ready && !failed ? (
          <div role="status" className="absolute inset-0 flex items-center justify-center">
            <LoaderCircle className="size-8 animate-spin text-ink-muted" aria-hidden="true" />
            <span className="sr-only">Đang tải ảnh</span>
          </div>
        ) : null}
      </div>

      <ImageLightboxToolbar
        percent={zoom.percent}
        disabled={!ready}
        canZoomIn={zoom.canZoomIn}
        canZoomOut={zoom.canZoomOut}
        isDefaultView={zoom.isDefaultView}
        onZoomIn={zoom.zoomIn}
        onZoomOut={zoom.zoomOut}
        onReset={zoom.reset}
      />
    </div>
  )
}

export { ImageLightboxViewer }
