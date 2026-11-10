import type { ReactNode } from "react"
import { useImageLoad } from "@/hooks/use-image-load"
import { imgAttrs, type ImgPresetName } from "@/lib/img-url"
import { STORE } from "@/lib/store-info"
import { cn } from "@/lib/utils"

/** Chỉ tải URL tuyệt đối (http, https): chuỗi khác sẽ bị trình duyệt hiểu là đường dẫn trên chính trang này. */
const LOADABLE_SRC = /^https?:\/\//i

/** Tỉ lệ khung ảnh sản phẩm: một nguồn duy nhất, lớp phủ nút trên thẻ sản phẩm (`ProductCard`) dùng chung để khớp đúng khung ảnh. */
export const PRODUCT_IMAGE_ASPECT = "aspect-[3/4]"

/**
 * Khung ảnh sản phẩm 3:4 cố định, bo góc `card` (cả thẻ sản phẩm lẫn ảnh lớn ở trang chi tiết), nên bố cục không giật dù ảnh tải xong lúc nào (ảnh gốc từ máy chủ, không có bản thu nhỏ).
 * Trong lúc tải là skeleton có vệt sáng lướt; tải xong thì ảnh mờ dần vào. Thiếu ảnh hoặc ảnh lỗi: chữ cái đầu của thương hiệu
 * trên nền trung tính. `alt` luôn là tên sản phẩm. `eager`: ảnh nằm ngay màn hình đầu thì tải ngay (không lazy).
 * `zoomOnHover`: phóng nhẹ khi rê chuột vào phần tử cha có class `group/card` (chỉ khi người dùng không giảm chuyển động).
 * `preset`: ngữ cảnh hiển thị để chọn kích thước ảnh Cloudinary (`lib/img-url.ts`; mặc định `card`, thẻ trong lưới). Khung đã có tỉ lệ cố định nên bản thu nhỏ không làm giật bố cục;
 * ảnh không phải Cloudinary (picsum, `/uploads/...`) được dùng nguyên URL.
 * `overlay`: lớp phủ trong khung (vd. ảnh thứ hai của thẻ sản phẩm, `ProductHoverImage`), nằm trên ảnh chính và bị cắt theo khung.
 */
function ProductImage({
  src,
  alt,
  eager = false,
  zoomOnHover = false,
  preset = "card",
  overlay,
  radius = "card",
  onLoaded,
  onFailed,
  className,
}: {
  src: string | null
  alt: string
  eager?: boolean
  zoomOnHover?: boolean
  preset?: ImgPresetName
  overlay?: ReactNode
  /** Bo góc: `card` (18px, mặc định) hoặc `panel` (28px, ảnh chính trang chi tiết). `cn()` không biết hai token này xung đột nên chọn bằng prop, không ghi đè bằng `className`. */
  radius?: "card" | "panel"
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
        "relative overflow-hidden",
        radius === "panel" ? "rounded-panel" : "rounded-card",
        PRODUCT_IMAGE_ASPECT,
        showImage && !loaded ? "shimmer" : "bg-surface-sunken",
        className,
      )}
    >
      {showImage && src ? (
        <img
          {...imgAttrs(src, preset)}
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
        <div aria-hidden="true" className="grid size-full place-items-center font-display text-display text-ink-muted">
          {STORE.name.charAt(0)}
        </div>
      )}
      {overlay}
    </div>
  )
}

export { ProductImage }
