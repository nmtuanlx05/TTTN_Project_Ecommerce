import { Link } from "react-router-dom"
import { ProductImage } from "@/components/storefront/product-image"
import { cn } from "@/lib/utils"

/** Một khung ảnh của hero. Có `to` thì là liên kết (tên truy cập = `alt`, hero không hiện caption). */
interface HeroFrame {
  key: string | number
  src: string | null
  alt: string
  to?: string
}

/**
 * Chiếm cột theo số khung (static để Tailwind nhận ra) và lệch dọc 0/48/96px: ảnh 3:4 lệch nhau tinh tế. Dưới `md` chỉ có 2
 * ảnh đầu (khung thứ 3 `hidden`, và vì nó `lazy` nên trình duyệt không tải ảnh bị ẩn).
 */
const FRAME_CLASS: Record<number, readonly string[]> = {
  1: ["col-span-8 col-start-3 md:col-span-6 md:col-start-4"],
  2: ["col-span-7", "col-span-5 mt-12"],
  3: ["col-span-7 md:col-span-5", "col-span-5 mt-12 md:col-span-4", "hidden md:col-span-3 md:mt-24 md:block"],
}

/** Khung chờ dữ liệu, cùng tỉ lệ 3:4 và cùng cách xếp như 3 khung thật. */
function HeroImagesSkeleton() {
  return (
    <div aria-hidden="true" className="grid grid-cols-12 gap-x-4 md:gap-x-6">
      {FRAME_CLASS[3].map((frameClass, index) => (
        <div key={index} className={frameClass}>
          <div className="shimmer aspect-[3/4]" />
        </div>
      ))}
    </div>
  )
}

/**
 * Ảnh hero. Ảnh đầu tiên là ảnh lớn nhất màn hình đầu nên tải ngay với ưu tiên cao (`eager`); ảnh còn lại lazy.
 * Không có khung nào (chưa có sản phẩm, hoặc lỗi) thì vẫn có MỘT khung trung tính, bố cục không vỡ.
 */
function HomeHeroImages({ frames }: { frames: HeroFrame[] }) {
  const shown = frames.length > 0 ? frames.slice(0, 3) : [{ key: "empty", src: null, alt: "" } satisfies HeroFrame]
  const classes = FRAME_CLASS[shown.length]

  return (
    <div className="grid grid-cols-12 gap-x-4 md:gap-x-6">
      {shown.map((frame, index) => {
        const image = (
          <ProductImage src={frame.src} alt={frame.alt} eager={index === 0} zoomOnHover={Boolean(frame.to)} />
        )
        return (
          <div key={frame.key} className={cn(classes[index])}>
            {frame.to ? (
              <Link to={frame.to} aria-label={frame.alt} className="group/card block">
                {image}
              </Link>
            ) : (
              image
            )}
          </div>
        )
      })}
    </div>
  )
}

export { HomeHeroImages, HeroImagesSkeleton }
export type { HeroFrame }
