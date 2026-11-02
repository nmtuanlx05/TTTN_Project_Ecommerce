import { useState } from "react"
import { ProductImage } from "@/components/storefront/product-image"
import { ImageLightbox } from "@/components/shared/image-lightbox"

/**
 * Ảnh lớn của trang chi tiết (API chỉ có một ảnh). Khi ảnh đã hiện ra, khung ảnh là một nút (`cursor-zoom-in`,
 * dùng được bằng bàn phím) mở `ImageLightbox` có sẵn. Ảnh thiếu/lỗi thì chỉ là khung trung tính, không có nút.
 * Ảnh chính là ảnh quan trọng nhất của trang nên tải ngay (`eager`, ưu tiên cao).
 */
function ProductGallery({ src, alt }: { src: string | null; alt: string }) {
  const [zoomable, setZoomable] = useState(false)
  const [open, setOpen] = useState(false)

  const image = (
    <ProductImage
      src={src}
      alt={alt}
      eager
      onLoaded={() => setZoomable(true)}
      onFailed={() => setZoomable(false)}
    />
  )

  if (!zoomable || !src) return image

  return (
    <>
      <button
        type="button"
        aria-label="Xem ảnh lớn"
        onClick={() => setOpen(true)}
        className="block w-full cursor-zoom-in"
      >
        {image}
      </button>
      <ImageLightbox src={src} alt={alt} open={open} onOpenChange={setOpen} />
    </>
  )
}

export { ProductGallery }
