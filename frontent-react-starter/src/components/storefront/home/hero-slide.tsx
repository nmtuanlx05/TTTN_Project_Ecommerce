import { Link } from "react-router-dom"
import { buttonVariants } from "@/components/ui/button"
import { StaticImage } from "@/components/storefront/static-image"
import type { CategoryTree } from "@/lib/category-tree"
import { homeHref } from "@/lib/home-links"
import type { HeroSlideContent } from "@/lib/home-content"
import { cn } from "@/lib/utils"

/**
 * Từ `lg`: cột chữ 46%, cột ảnh 54% (cột chữ canh theo container, ảnh cách mép phải theo `--hero-image-inset`). Số 46 phải khớp `HERO_TEXT_WIDTH_CLASS`
 * ở `hero-layout.ts` (bề rộng hàng điều khiển nằm đè đúng cột chữ). Ghi đủ chuỗi class vì Tailwind chỉ nhận class viết nguyên văn trong mã.
 */
const HERO_SPLIT_CLASS = "lg:grid-cols-[46fr_54fr]"

/**
 * Di động: ảnh vuông nhưng cao tối đa 40% chiều cao màn hình (`svh`), để tiêu đề và nút chính còn trong màn hình đầu ở 375×667 (đã đo). Màn hình đủ cao
 * (≥ ~940px ở bề rộng 375) thì vẫn vuông; thấp hơn thì ảnh cắt bớt chiều cao (`object-cover`, vùng giữ lại theo `objectPosition`).
 */
const HERO_IMAGE_MOBILE_CLASS = "aspect-square max-h-[40svh]"

/**
 * Khung ảnh bo góc có lề quanh (không còn tràn sát mép). Dưới `lg`: lề ngang `gutter`, bo `card`. Từ `lg`: lề trên/dưới `gutter`, bo `panel`, và lề phải là `--hero-image-inset`
 * (global.css): màn hẹp thì một gutter, màn rộng thì ảnh chỉ lòi ra ngoài lề phải của container tối đa `--hero-bleed`, không lòi thêm.
 */
const HERO_IMAGE_FRAME_CLASS =
  "relative max-lg:order-first max-lg:mx-gutter max-lg:mt-4 max-lg:rounded-card lg:my-gutter lg:mr-(--hero-image-inset) lg:rounded-panel overflow-hidden"

/**
 * Một slide của hero: cột chữ (nhãn có đường kẻ ngắn, tiêu đề, phụ đề serif nghiêng, mô tả, hai nút) và cột ảnh bo góc có lề.
 * Ba slide xếp chồng trong CÙNG một ô lưới nên chiều cao không nhảy khi đổi; slide không hiện thì `inert` (không focus được, không bấm được,
 * ẩn khỏi cây truy cập) và mờ đi. Không dùng `visibility`: chuyển `hidden → visible` giữ `hidden` tới hết chuyển động nên `focus()` ngay sau khi đổi slide sẽ thất bại. Chữ trồi nhẹ khi vào (bỏ khi giảm chuyển động).
 *
 * Bố cục: dưới `lg` ảnh ở trên (vuông dưới `md`, 3:2 từ `md`; ảnh vuông bị chặn cao theo màn hình để tiêu đề và nút chính còn trong màn hình đầu),
 * chữ ở dưới. Từ `lg` chia 46/54, cao `--hero-h`, cột chữ canh theo mép trái container (`--container-inset`), ảnh có lề (xem `HERO_IMAGE_FRAME_CLASS`).
 * `pb-24` chừa chỗ cho hàng điều khiển nằm đè phía dưới (`HeroControls`).
 */
function HeroSlide({
  slide,
  tree,
  position,
  total,
  active,
  eager,
  eyebrow,
}: {
  slide: HeroSlideContent
  tree: CategoryTree | null
  /** Thứ tự 1..total. */
  position: number
  total: number
  active: boolean
  /** Chỉ ảnh của slide đầu tiên: tải ngay với ưu tiên cao. */
  eager: boolean
  eyebrow: string
}) {
  return (
    <div
      role="group"
      aria-roledescription="slide"
      aria-label={`${position} / ${total}`}
      inert={!active}
      data-active={active}
      className={cn(
        "col-start-1 row-start-1 grid max-lg:content-start transition-opacity duration-(--motion-image) ease-smooth lg:h-(--hero-h)",
        HERO_SPLIT_CLASS,
        active ? "opacity-100" : "opacity-0",
      )}
    >
      <div
        className={cn(
          "flex min-w-0 flex-col justify-start gap-stack px-gutter pt-6 pb-24 transition-transform duration-(--motion-slow) ease-smooth lg:justify-center lg:py-0 lg:pr-12 lg:pl-(--container-inset)",
          active ? "translate-y-0" : "motion-safe:translate-y-3",
        )}
      >
        <p className="flex items-center gap-3 text-overline uppercase text-ink-muted">
          <span aria-hidden="true" className="h-px w-8 bg-ink-muted" />
          {eyebrow}
        </p>
        <h2 className="text-h1 uppercase text-balance text-ink md:text-display lg:text-h1 xl:text-display">{slide.title}</h2>
        <p className="font-serif text-h3 font-normal text-ink italic md:text-h2">{slide.subtitle}</p>
        <p className="max-w-prose text-body-sm text-ink-muted md:text-body">{slide.description}</p>
        <div className="flex flex-wrap gap-inline pt-2">
          <Link to={homeHref(tree, slide.primary.categorySlug)} className={cn(buttonVariants({ size: "lg" }), "press")}>
            {slide.primary.label}
          </Link>
          <Link
            to={homeHref(tree, slide.secondary.categorySlug)}
            className={cn(buttonVariants({ size: "lg", variant: "secondary" }), "press")}
          >
            {slide.secondary.label}
          </Link>
        </div>
      </div>
      <div className={cn(HERO_IMAGE_FRAME_CLASS, HERO_IMAGE_MOBILE_CLASS, "md:aspect-[3/2] md:max-h-none lg:aspect-auto")}>
        <StaticImage
          src={slide.image.src}
          alt={slide.image.alt}
          objectPosition={slide.image.objectPosition}
          eager={eager}
        />
      </div>
    </div>
  )
}

export { HeroSlide }
