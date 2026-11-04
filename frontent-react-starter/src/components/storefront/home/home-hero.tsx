import { useEffect, useRef } from "react"
import { useCarousel } from "@/hooks/use-carousel"
import { useSwipe } from "@/hooks/use-swipe"
import type { CategoryTree } from "@/lib/category-tree"
import { HOME } from "@/lib/home-content"
import { STORE } from "@/lib/store-info"
import { HeroControls } from "./hero-controls"
import { HeroSlide } from "./hero-slide"

const { slides, eyebrow } = HOME.hero
const TITLES = slides.map((slide) => slide.title)

/**
 * Hero trang chủ: carousel THỦ CÔNG 3 slide (nút, thanh tiến trình, phím ←/→ khi focus nằm trong hero, vuốt cảm ứng; không tự chạy).
 *
 * Truy cập: vùng là `carousel` có nhãn, mỗi slide là `group` "n / 3", slide không hiện bị `inert`; vùng `aria-live="polite"` báo vị trí và
 * tiêu đề slide mới. Trang có đúng MỘT `h1` (ẩn thị giác, tên cửa hàng + khẩu hiệu), tiêu đề slide là `h2`.
 * `@container`: để cột chữ canh theo mép trái container bằng đơn vị `cqw` (xem `--container-inset` ở global.css).
 * Khi đổi slide bằng bàn phím hoặc vuốt mà focus đang nằm trong slide cũ (đang `inert`), chuyển focus sang nút đầu của slide mới để không rơi về `body`.
 */
function HomeHero({ tree }: { tree: CategoryTree | null }) {
  const carousel = useCarousel(slides.length)
  const slidesRef = useRef<HTMLDivElement>(null)
  const refocus = useRef(false)

  const rememberFocus = () => {
    refocus.current = slidesRef.current?.contains(document.activeElement) ?? false
  }
  const swipe = useSwipe({
    onSwipeLeft: () => {
      rememberFocus()
      carousel.next()
    },
    onSwipeRight: () => {
      rememberFocus()
      carousel.prev()
    },
  })

  useEffect(() => {
    if (!refocus.current) return
    refocus.current = false
    slidesRef.current?.querySelector<HTMLElement>('[data-active="true"] a')?.focus()
  }, [carousel.index])

  return (
    <section
      aria-roledescription="carousel"
      aria-label="Bộ sưu tập nổi bật"
      onKeyDown={(event) => {
        rememberFocus()
        carousel.onKeyDown(event)
      }}
      {...swipe}
      className="@container relative touch-pan-y"
    >
      <h1 className="sr-only">
        {STORE.name} — {STORE.tagline}
      </h1>
      <div ref={slidesRef} className="grid">
        {slides.map((slide, position) => (
          <HeroSlide
            key={slide.title}
            slide={slide}
            tree={tree}
            position={position + 1}
            total={slides.length}
            active={position === carousel.index}
            eager={position === 0}
            eyebrow={eyebrow}
          />
        ))}
      </div>
      <p className="sr-only" aria-live="polite">
        Slide {carousel.index + 1} / {slides.length}: {TITLES[carousel.index]}
      </p>
      <HeroControls
        titles={TITLES}
        index={carousel.index}
        onSelect={carousel.goTo}
        onPrev={carousel.prev}
        onNext={carousel.next}
      />
    </section>
  )
}

export { HomeHero }
