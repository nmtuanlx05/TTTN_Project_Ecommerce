import { useState, type ReactNode } from "react"
import { ImageOff } from "lucide-react"
import { cn } from "@/lib/utils"
import { ImageLightbox } from "./image-lightbox"

const SHAPE_CLASS = {
  /** Vuông, thấy trọn ảnh (ô chọn ảnh sản phẩm). */
  square: "aspect-square rounded-xs",
  /** Dọc 3:4, cắt vừa khung (ảnh nhỏ trong bảng). */
  portrait: "aspect-[3/4] rounded-xs",
  /** Tròn, cắt vừa khung (ảnh đại diện). */
  circle: "aspect-square rounded-full",
} as const

const FIT_CLASS = { cover: "object-cover", contain: "object-contain" } as const

type ImageShape = keyof typeof SHAPE_CLASS

/**
 * Chỉ tải URL tuyệt đối (http, https) hoặc ảnh xem trước vừa chọn (blob). Chuỗi khác (đang gõ dở "htt",
 * đường dẫn tương đối) mà đưa vào `<img>` sẽ bị coi là đường dẫn trên chính trang này và gọi nhầm về máy chủ dev.
 */
const LOADABLE_SRC = /^(https?:\/\/|blob:)/i

/**
 * Khung hiển thị ảnh từ một URL bất kỳ (ảnh upload hoặc URL ngoài). Không có ảnh hoặc ảnh không tải
 * được thì hiện ô trống có icon. `failedSrc` nhớ đúng URL đã lỗi (không phải cờ chung) nên đổi URL là
 * thử tải lại ngay. Kích thước do nơi gọi đặt qua `className` (chiều rộng hoặc `size-*`).
 * `children` là lớp phủ lên ảnh (đang tải, đang kéo-thả...). `fallback` thay ô trống mặc định nếu cần hiện thứ khác.
 *
 * `zoomable`: khi bật và có ảnh hợp lệ, khung ảnh là một nút bấm để xem ảnh lớn (`ImageLightbox`). Nút là
 * `type="button"` vì thường nằm trong form. Lightbox chỉ được dựng sau lần mở đầu tiên của từng ảnh để bảng
 * nhiều dòng không dựng sẵn hàng chục dialog.
 */
function ImagePreview({
  src,
  alt,
  shape = "square",
  fit = shape === "square" ? "contain" : "cover",
  showFallbackText = false,
  zoomable = false,
  fallback,
  className,
  children,
}: {
  src: string | null
  alt: string
  shape?: ImageShape
  fit?: keyof typeof FIT_CLASS
  /** Hiện chữ "Chưa có ảnh" / "Không tải được ảnh" dưới icon; chỉ nên bật ở khung đủ lớn. */
  showFallbackText?: boolean
  /** Bấm vào ảnh để xem ảnh lớn. Chỉ có tác dụng khi ảnh hiển thị được. */
  zoomable?: boolean
  /** Thay icon và chữ mặc định khi không có ảnh hoặc ảnh không tải được (vd. chữ cái đầu của avatar). */
  fallback?: ReactNode
  className?: string
  children?: ReactNode
}) {
  const [failedSrc, setFailedSrc] = useState<string | null>(null)
  const [lightbox, setLightbox] = useState({ mounted: false, open: false })
  const showImage = src !== null && LOADABLE_SRC.test(src) && failedSrc !== src
  const fallbackText = src ? "Không tải được ảnh" : "Chưa có ảnh"
  const image = showImage ? (
    <img
      src={src}
      alt={alt}
      loading="lazy"
      referrerPolicy="no-referrer"
      onError={() => setFailedSrc(src)}
      className={cn("size-full", FIT_CLASS[fit])}
    />
  ) : null

  return (
    <div
      className={cn(
        "relative flex shrink-0 items-center justify-center overflow-hidden border border-border-subtle bg-surface-sunken",
        SHAPE_CLASS[shape],
        className,
      )}
    >
      {showImage && zoomable ? (
        <button
          type="button"
          aria-label={`Xem ảnh lớn: ${alt}`}
          title="Bấm để xem ảnh lớn"
          onClick={() => setLightbox({ mounted: true, open: true })}
          className="absolute inset-0 cursor-zoom-in outline-none focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-ring"
        >
          {image}
        </button>
      ) : showImage ? (
        image
      ) : fallback ? (
        fallback
      ) : (
        <div className="flex flex-col items-center gap-1 px-1 text-center text-ink-muted">
          <ImageOff
            className="size-4"
            role="img"
            aria-label={fallbackText}
          />
          {showFallbackText ? <span className="text-caption">{fallbackText}</span> : null}
        </div>
      )}
      {children}
      {showImage && zoomable && lightbox.mounted ? (
        <ImageLightbox
          src={src}
          alt={alt}
          open={lightbox.open}
          onOpenChange={(open) => setLightbox((current) => ({ ...current, open }))}
        />
      ) : null}
    </div>
  )
}

export { ImagePreview }
