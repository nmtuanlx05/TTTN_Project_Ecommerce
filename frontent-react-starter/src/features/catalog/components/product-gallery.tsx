import { useState } from "react"
import { ProductImage } from "@/components/storefront/product-image"
import { ImageLightbox } from "@/components/shared/image-lightbox"
import { GalleryThumbs } from "./gallery-thumbs"

/** Ảnh chính 4:5 bo `panel`. Khi ảnh đã hiện ra, khung ảnh là một nút (`cursor-zoom-in`) mở `ImageLightbox`. Ảnh thiếu/lỗi thì chỉ là khung trung tính, không có nút. */
function MainImage({ src, alt }: { src: string | null; alt: string }) {
  const [zoomable, setZoomable] = useState(false)
  const [open, setOpen] = useState(false)

  const image = (
    <ProductImage
      src={src}
      alt={alt}
      eager
      radius="panel"
      preset="detail"
      className="aspect-[4/5]"
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
        className="block w-full cursor-zoom-in rounded-panel"
      >
        {image}
      </button>
      <ImageLightbox src={src} alt={alt} open={open} onOpenChange={setOpen} />
    </>
  )
}

/**
 * Bộ ảnh của trang chi tiết, nhận MỘT DANH SÁCH ảnh (hiện API chỉ có một ảnh nên thường là một phần tử; rỗng thì hiện khung dự phòng). Từ 2 ảnh trở lên
 * mới hiện hàng ảnh nhỏ (`GalleryThumbs`) để đổi ảnh chính; chỉ một ảnh thì không có hàng đó. Ảnh chính là ảnh quan trọng nhất của trang nên tải ngay (`eager`, ưu tiên cao).
 */
function ProductGallery({ images, alt }: { images: string[]; alt: string }) {
  const [current, setCurrent] = useState(0)
  const index = Math.min(current, Math.max(images.length - 1, 0))

  return (
    <div className="flex flex-col gap-4">
      <MainImage key={index} src={images[index] ?? null} alt={alt} />
      {images.length > 1 ? <GalleryThumbs images={images} alt={alt} current={index} onSelect={setCurrent} /> : null}
    </div>
  )
}

export { ProductGallery }
