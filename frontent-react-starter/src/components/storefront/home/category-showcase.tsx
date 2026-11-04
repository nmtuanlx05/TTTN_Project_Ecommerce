import { ViewAllLink } from "@/components/storefront/view-all-link"
import type { CategoryTree } from "@/lib/category-tree"
import { HOME } from "@/lib/home-content"
import { hasCategory, homeHref } from "@/lib/home-links"
import { CategoryCard } from "./category-card"
import { HomeSection } from "./home-section"

const GRID = "grid grid-cols-2 gap-4 md:grid-cols-4 md:gap-6"
const { cards, eyebrow, title, viewAll } = HOME.categories

/**
 * "Danh mục nổi bật": 4 thẻ dọc (2 cột di động, 4 cột từ `md`). Thẻ chỉ hiện khi danh mục của nó có trong cây (không tạo liên kết chết);
 * đang tải thì skeleton cùng tỉ lệ; cây lỗi hoặc không thẻ nào khớp thì ẩn cả khối (header đã tự giảm cấp).
 */
function CategoryShowcase({ tree, loading }: { tree: CategoryTree | null; loading: boolean }) {
  const shown = cards.filter((card) => hasCategory(tree, card.categorySlug))
  if (!loading && shown.length === 0) return null

  return (
    <HomeSection
      id="home-categories"
      eyebrow={eyebrow}
      title={title}
      action={<ViewAllLink to="/products">{viewAll}</ViewAllLink>}
    >
      {loading ? (
        <ul aria-hidden="true" className={GRID}>
          {cards.map((card) => (
            <li key={card.categorySlug} className="shimmer aspect-[3/4] rounded-card" />
          ))}
        </ul>
      ) : (
        <ul className={GRID}>
          {shown.map((card) => (
            <li key={card.categorySlug}>
              <CategoryCard card={card} href={homeHref(tree, card.categorySlug)} />
            </li>
          ))}
        </ul>
      )}
    </HomeSection>
  )
}

export { CategoryShowcase }
