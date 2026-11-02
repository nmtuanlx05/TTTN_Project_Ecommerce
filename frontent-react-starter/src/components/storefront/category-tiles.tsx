import { Link } from "react-router-dom"
import { ArrowUpRight } from "lucide-react"
import type { CategoryNode } from "@/lib/category-tree"
import { STORE } from "@/lib/store-info"
import { SectionHeading } from "./section-heading"

const GRID = "grid grid-cols-2 gap-4 md:grid-cols-4 md:gap-6"
const TILE = "min-h-32 md:min-h-40"

/**
 * Lưới ô chữ cho danh mục cấp 1 (tên lớn, không có ảnh). Mũi tên chỉ ẩn khi thiết bị CÓ hover (chuột) và hiện khi rê chuột hoặc focus;
 * thiết bị cảm ứng (kể cả máy tính bảng rộng) không có hover nên luôn hiện. `categories` là null khi đang tải (skeleton cùng kích thước ô để không nhảy bố cục).
 */
function CategoryTiles({ categories }: { categories: CategoryNode[] | null }) {
  return (
    <section aria-labelledby="home-categories" className="flex flex-col gap-8">
      <SectionHeading id="home-categories" title={STORE.home.categoriesTitle} />
      {categories === null ? (
        <ul aria-hidden="true" className={GRID}>
          {Array.from({ length: 4 }, (_, index) => (
            <li key={index} className={`shimmer ${TILE}`} />
          ))}
        </ul>
      ) : (
        <ul className={GRID}>
          {categories.map((category) => (
            <li key={category.id}>
              <Link
                to={`/products?category=${encodeURIComponent(category.slug)}`}
                className={`group/tile flex h-full ${TILE} flex-col justify-between border border-border-subtle p-card transition-colors duration-(--motion-base) ease-smooth hover:border-border-strong hover:bg-surface-hover`}
              >
                <ArrowUpRight
                  aria-hidden="true"
                  className="size-6 self-end text-ink transition-[opacity,transform] duration-(--motion-base) ease-smooth [@media(hover:hover)]:opacity-0 motion-safe:[@media(hover:hover)]:translate-y-1 group-hover/tile:opacity-100 group-focus-visible/tile:opacity-100 motion-safe:group-hover/tile:translate-y-0 motion-safe:group-focus-visible/tile:translate-y-0"
                />
                <span className="text-h2 text-ink">{category.name}</span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}

export { CategoryTiles }
