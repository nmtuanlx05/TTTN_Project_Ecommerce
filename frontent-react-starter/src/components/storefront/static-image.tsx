import { useImageLoad } from "@/hooks/use-image-load"
import { STORE } from "@/lib/store-info"
import { cn } from "@/lib/utils"

/** Chỉ nhận đường dẫn trong `public/` ("/home/x.webp"); "//host/x" là URL cùng giao thức của máy khác nên bị loại. */
const STATIC_SRC = /^\/(?!\/)/

/**
 * Ảnh tĩnh trong `public/` (hero, thẻ danh mục, dải câu chuyện) lấp đầy khung của phần tử cha (`absolute inset-0`; cha phải `relative` và có kích
 * thước/tỉ lệ). Trong lúc tải là skeleton; xong thì mờ dần vào. Thiếu file hoặc lỗi tải: khung trung tính kèm chữ cái đầu thương hiệu (token,
 * tự theo phạm vi sáng/tối của cha), không bao giờ hiện chữ giữ chỗ. `objectPosition` là vùng ảnh giữ lại khi bị cắt (cấu hình ở `lib/home-content.ts`).
 * `alt` rỗng = ảnh trang trí. `eager`: ảnh nằm ngay màn hình đầu thì tải ngay với ưu tiên cao; còn lại lazy.
 */
function StaticImage({
  src,
  alt,
  objectPosition,
  eager = false,
  zoomOnHover = false,
  fallbackLetter = true,
  className,
}: {
  src: string
  alt: string
  objectPosition?: string
  eager?: boolean
  /** Phóng nhẹ khi rê chuột vào phần tử cha có class `group/card`. */
  zoomOnHover?: boolean
  /** Khung dự phòng có hiện chữ cái đầu thương hiệu không (tắt cho nền dải rộng, nơi chữ cái lớn sẽ đè lên nội dung). */
  fallbackLetter?: boolean
  className?: string
}) {
  const { showImage, loaded, imgProps } = useImageLoad({ src, usable: STATIC_SRC.test(src) })

  return (
    <div className={cn("absolute inset-0 overflow-hidden", showImage && !loaded ? "shimmer" : "bg-surface-sunken", className)}>
      {showImage ? (
        <img
          src={src}
          alt={alt}
          loading={eager ? "eager" : "lazy"}
          decoding="async"
          fetchPriority={eager ? "high" : undefined}
          style={objectPosition ? { objectPosition } : undefined}
          {...imgProps}
          className={cn(
            "size-full object-cover transition-[opacity,transform] duration-(--motion-image) ease-smooth",
            loaded ? "opacity-100" : "opacity-0",
            zoomOnHover && "motion-safe:group-hover/card:scale-103",
          )}
        />
      ) : (
        <div aria-hidden="true" className="grid size-full place-items-center font-display text-display text-ink-muted">
          {fallbackLetter ? STORE.name.charAt(0) : null}
        </div>
      )}
    </div>
  )
}

export { StaticImage }
