import { useImageLoad } from "@/hooks/use-image-load"
import { STORE } from "@/lib/store-info"
import { cn } from "@/lib/utils"

/** Chỉ tải URL tuyệt đối (http, https): chuỗi khác sẽ bị trình duyệt hiểu là đường dẫn trên chính trang này. */
const LOADABLE_SRC = /^https?:\/\//i

/**
 * Khung ảnh sản phẩm 3:4 cố định, nên bố cục không giật dù ảnh tải xong lúc nào (ảnh gốc từ máy chủ, không có bản thu nhỏ).
 * Trong lúc tải là skeleton có vệt sáng lướt; tải xong thì ảnh mờ dần vào. Thiếu ảnh hoặc ảnh lỗi: chữ cái đầu của thương hiệu
 * trên nền trung tính. `alt` luôn là tên sản phẩm. `eager`: ảnh nằm ngay màn hình đầu thì tải ngay (không lazy).
 * `zoomOnHover`: phóng nhẹ khi rê chuột vào phần tử cha có class `group/card` (chỉ khi người dùng không giảm chuyển động).
 */
function ProductImage({
  src,
  alt,
  eager = false,
  zoomOnHover = false,
  onLoaded,
  onFailed,
  className,
}: {
  src: string | null
  alt: string
  eager?: boolean
  zoomOnHover?: boolean
  /** Ảnh đã tải xong / không tải được (vd. chỉ bật nút xem ảnh lớn khi ảnh thật sự hiện ra). */
  onLoaded?: () => void
  onFailed?: () => void
  className?: string
}) {
  const { showImage, loaded, imgProps } = useImageLoad({
    src,
    usable: src !== null && LOADABLE_SRC.test(src),
    onLoaded,
    onFailed,
  })

  return (
    <div
      className={cn(
        "relative aspect-[3/4] overflow-hidden",
        showImage && !loaded ? "shimmer" : "bg-surface-sunken",
        className,
      )}
    >
      {showImage && src ? (
        <img
          src={src}
          alt={alt}
          loading={eager ? "eager" : "lazy"}
          decoding="async"
          fetchPriority={eager ? "high" : undefined}
          referrerPolicy="no-referrer"
          {...imgProps}
          className={cn(
            "size-full object-cover transition-[opacity,transform] duration-(--motion-image) ease-smooth",
            loaded ? "opacity-100" : "opacity-0",
            zoomOnHover && "motion-safe:group-hover/card:scale-103",
          )}
        />
      ) : (
        <div
          aria-hidden="true"
          className="grid size-full place-items-center font-display text-display text-ink-muted"
        >
          {STORE.name.charAt(0)}
        </div>
      )}
    </div>
  )
}

export { ProductImage }
