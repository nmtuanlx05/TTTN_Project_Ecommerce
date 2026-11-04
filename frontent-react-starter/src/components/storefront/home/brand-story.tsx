import { Link } from "react-router-dom"
import { buttonVariants } from "@/components/ui/button"
import { Reveal } from "@/components/storefront/reveal"
import { StaticImage } from "@/components/storefront/static-image"
import { HOME } from "@/lib/home-content"
import { cn } from "@/lib/utils"

const { eyebrow, title, description, cta, image } = HOME.story

/**
 * "Câu chuyện thương hiệu": THẺ tối bo góc `panel`, rộng hơn khung nội dung đúng `--story-bleed` (32px) mỗi bên từ `lg` (xem global.css về đoạn 1024–1312px, nơi mức lòi co lại để thẻ không tràn); dưới `lg` thì theo container (lề `gutter` như `PageContainer`, tự viết class vì bề rộng khác).
 * Phạm vi `dark` + `surface-sunken` (như chân trang) nên tối cố định; ảnh nền tĩnh phủ `scrim/70` (đủ tối để chữ `ink` đạt tương phản ≥ 4,5:1 kể cả trên ảnh trắng;
 * chữ phụ `ink-muted` KHÔNG đạt trên ảnh trắng nên khối này chỉ dùng `ink`); chưa có ảnh thì chỉ còn nền tối. Nhãn và tiêu đề dùng serif NGHIÊNG THẬT
 * (Newsreader), nút là nút đặc của phạm vi tối nên sáng và đảo thành nền tối khi hover.
 */
function BrandStory() {
  return (
    <Reveal className="mt-block">
      <div className="mx-auto w-full max-w-7xl px-gutter lg:max-w-(--story-max) lg:px-(--story-edge)">
        <section aria-labelledby="home-story" className="dark relative isolate overflow-hidden rounded-panel bg-surface-sunken text-ink">
          <StaticImage src={image.src} alt={image.alt} objectPosition={image.objectPosition} fallbackLetter={false} />
          <div aria-hidden="true" className="absolute inset-0 bg-scrim/70" />
          <div className="relative flex min-h-104 flex-col items-start justify-center gap-stack p-8 md:p-14 lg:min-h-136">
            <p className="font-serif text-h3 font-normal italic">{eyebrow}</p>
            <h2 id="home-story" className="max-w-3xl font-serif text-display font-normal text-balance italic">
              {title}
            </h2>
            <p className="max-w-prose text-body text-ink">{description}</p>
            <Link to="/products" className={cn(buttonVariants({ size: "lg" }), "press mt-2")}>
              {cta}
            </Link>
          </div>
        </section>
      </div>
    </Reveal>
  )
}

export { BrandStory }
