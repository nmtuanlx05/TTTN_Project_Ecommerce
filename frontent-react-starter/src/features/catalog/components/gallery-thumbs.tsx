import { ProductImage } from "@/components/storefront/product-image"
import { cn } from "@/lib/utils"

/**
 * Hàng ảnh nhỏ dưới ảnh chính: 4 cột đều, ô vuông bo `card`, ô đang chọn có viền `ink` (+ `aria-current`, không chỉ dựa vào màu). Mỗi ô là một nút
 * (Tab + Enter/Space đổi ảnh chính, vùng bấm rộng hơn 44px). Chỉ dựng khi có từ 2 ảnh (do `ProductGallery` quyết).
 */
function GalleryThumbs({
  images,
  alt,
  current,
  onSelect,
}: {
  images: string[]
  alt: string
  current: number
  onSelect: (index: number) => void
}) {
  return (
    <ul className="grid grid-cols-4 gap-3">
      {images.map((src, index) => (
        <li key={`${index}-${src}`}>
          <button
            type="button"
            aria-label={`Xem ảnh ${index + 1} / ${images.length}`}
            aria-current={index === current ? "true" : undefined}
            onClick={() => onSelect(index)}
            className={cn(
              "press block w-full rounded-card transition-shadow duration-(--motion-fast) ease-smooth",
              index === current && "ring-2 ring-ink ring-offset-2 ring-offset-canvas",
            )}
          >
            <ProductImage src={src} alt={`${alt} (ảnh ${index + 1})`} className="aspect-square" />
          </button>
        </li>
      ))}
    </ul>
  )
}

export { GalleryThumbs }
