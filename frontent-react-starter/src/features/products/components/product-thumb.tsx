import { useState } from "react"
import { ImageOff } from "lucide-react"
import { cn } from "@/lib/utils"

/**
 * Ảnh sản phẩm từ URL ngoài. Không có ảnh hoặc ảnh không tải được thì hiện ô trống có icon.
 * `failedSrc` nhớ URL đã lỗi (không phải cờ chung) nên đổi URL là thử tải lại ngay.
 */
function ProductThumb({
  src,
  alt,
  className,
}: {
  src: string | null
  alt: string
  className?: string
}) {
  const [failedSrc, setFailedSrc] = useState<string | null>(null)
  const showImage = src !== null && src !== "" && failedSrc !== src

  return (
    <div
      className={cn(
        "flex aspect-[3/4] shrink-0 items-center justify-center overflow-hidden rounded-xs border border-border-subtle bg-surface-sunken",
        className,
      )}
    >
      {showImage ? (
        <img
          src={src}
          alt={alt}
          loading="lazy"
          referrerPolicy="no-referrer"
          onError={() => setFailedSrc(src)}
          className="size-full object-cover"
        />
      ) : (
        <ImageOff className="size-4 text-ink-muted" aria-label={src ? "Không tải được ảnh" : "Chưa có ảnh"} role="img" />
      )}
    </div>
  )
}

export { ProductThumb }
