import { useState } from "react"
import { imgAttrs } from "@/lib/img-url"
import { cn } from "@/lib/utils"

/** Ảnh nhỏ vuông bo góc của dòng hàng trong đơn (ảnh chụp lúc đặt). Thiếu hoặc lỗi ảnh thì giữ khung trung tính. `className` đặt kích thước. */
function OrderThumb({ src, className }: { src: string | null; className?: string }) {
  const [failed, setFailed] = useState(false)
  const usable = src !== null && /^https?:\/\//i.test(src) && !failed
  return (
    <span className={cn("relative block shrink-0 overflow-hidden rounded-card bg-surface-sunken", className)}>
      {usable ? (
        <img
          {...imgAttrs(src, "tiny")}
          alt=""
          loading="lazy"
          decoding="async"
          referrerPolicy="no-referrer"
          onError={() => setFailed(true)}
          className="size-full object-cover"
        />
      ) : null}
    </span>
  )
}

export { OrderThumb }
