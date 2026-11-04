import { Link } from "react-router-dom"
import { ArrowRight } from "lucide-react"
import { StaticImage } from "@/components/storefront/static-image"
import type { HomeCategoryCard } from "@/lib/home-content"

/**
 * Thẻ danh mục dọc 3:4: ảnh nền, lớp tối dần ở đáy (`scrim`, ngoại lệ gradient duy nhất của dự án), tên ở góc dưới trái, mũi tên ở góc dưới phải.
 * Phạm vi `dark` nên chữ luôn sáng, và thiếu ảnh thì nền là `surface-sunken` tối (chữ vẫn đọc được). Hover: ảnh phóng nhẹ, mũi tên dịch phải
 * (chỉ khi người dùng không giảm chuyển động). Vòng focus vẽ BÊN TRONG thẻ (offset âm): vòng ngoài của phạm vi `dark` là màu sáng, sẽ biến mất trên nền trang sáng.
 */
function CategoryCard({ card, href }: { card: HomeCategoryCard; href: string }) {
  return (
    <Link
      to={href}
      className="dark group/card relative block aspect-[3/4] overflow-hidden bg-surface-sunken text-ink focus-visible:-outline-offset-4"
    >
      <StaticImage src={card.image.src} alt="" objectPosition={card.image.objectPosition} zoomOnHover />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 bg-linear-to-t from-scrim/85 via-scrim/50 via-30% to-transparent to-65%"
      />
      <span className="absolute inset-x-0 bottom-0 flex items-center justify-between gap-inline p-4 text-body font-medium md:p-5">
        {card.label}
        <ArrowRight
          aria-hidden="true"
          className="size-5 shrink-0 transition-transform duration-(--motion-base) ease-smooth motion-safe:group-hover/card:translate-x-1"
        />
      </span>
    </Link>
  )
}

export { CategoryCard }
