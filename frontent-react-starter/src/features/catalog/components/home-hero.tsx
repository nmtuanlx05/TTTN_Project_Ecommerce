import { Link } from "react-router-dom"
import { buttonVariants } from "@/components/ui/button"
import { STORE } from "@/lib/store-info"
import { HOME_HERO_IMAGES, HOME_NEW_ARRIVALS } from "../constants"
import { useCatalogProducts } from "../queries"
import { HeroImagesSkeleton, HomeHeroImages, type HeroFrame } from "./home-hero-images"

/**
 * Hero trang chủ: khẩu hiệu lớn (h1 duy nhất của trang), mô tả, nút "Khám phá cửa hàng" và tối đa 3 ảnh. Ảnh lấy từ
 * `STORE.heroImages` nếu có (ảnh tĩnh trong `public/`), không thì từ 3 sản phẩm mới nhất của CÙNG request với khối "Sản phẩm
 * mới" (`limit=8`, một lần gọi). Lỗi tải thì hero vẫn hiện (khung trung tính); nút thử lại nằm ở khối "Sản phẩm mới".
 */
function HomeHero() {
  const hasStatic = STORE.heroImages.length > 0
  const { data, isPending } = useCatalogProducts({ limit: HOME_NEW_ARRIVALS }, { enabled: !hasStatic })

  const frames: HeroFrame[] = hasStatic
    ? STORE.heroImages.slice(0, HOME_HERO_IMAGES).map((image) => ({ key: image.src, src: image.src, alt: image.alt }))
    : (data?.items ?? []).slice(0, HOME_HERO_IMAGES).map((product) => ({
        key: product.id,
        src: product.imageUrl,
        alt: product.name,
        to: `/products/${encodeURIComponent(product.slug)}`,
      }))

  return (
    <section className="grid items-start gap-10 lg:grid-cols-12 lg:gap-16">
      <div className="flex flex-col gap-stack lg:col-span-6">
        <h1 className="text-display text-balance uppercase text-ink">{STORE.tagline}</h1>
        <p className="max-w-prose text-body-lg text-ink-muted">{STORE.description}</p>
        <div className="pt-4">
          <Link to="/products" className={buttonVariants({ size: "lg", className: "press" })}>
            {STORE.home.cta}
          </Link>
        </div>
      </div>
      <div className="lg:col-span-6">
        {!hasStatic && isPending ? <HeroImagesSkeleton /> : <HomeHeroImages frames={frames} />}
      </div>
    </section>
  )
}

export { HomeHero }
