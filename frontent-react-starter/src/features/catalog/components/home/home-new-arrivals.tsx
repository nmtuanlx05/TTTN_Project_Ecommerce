import { useState } from "react"
import { PackageOpen } from "lucide-react"
import { HomeSection } from "@/components/storefront/home/home-section"
import { HScrollList } from "@/components/storefront/hscroll-list"
import { StateMessage } from "@/components/storefront/state-message"
import { TabBar } from "@/components/storefront/tab-bar"
import type { CategoryTree } from "@/lib/category-tree"
import { HOME } from "@/lib/home-content"
import { hasCategory } from "@/lib/home-links"
import { panelDomId, tabDomId } from "@/lib/tab-ids"
import { HOME_NEW_ARRIVALS, STRIP_CARD_WIDTH } from "../../home-constants"
import { useCatalogProducts } from "../../queries"
import { CatalogError } from "../catalog-states"
import { ProductCard } from "../product-card"
import { ProductStripSkeleton } from "./product-strip-skeleton"

const TAB_PREFIX = "home-new-arrivals"
const { eyebrow, title, tabs: allTabs } = HOME.newArrivals

/**
 * "Sản phẩm mới về": tiêu đề bên trái, tab bên phải ("Tất cả", "Áo mới", "Quần mới"; tab danh mục chỉ hiện khi danh mục tồn tại, còn mỗi "Tất cả" thì
 * ẩn cả thanh tab). Mỗi tab gọi GET /products (mới nhất trước, 8 sản phẩm, tab danh mục kèm `categoryId`); đổi tab giữ danh sách cũ mờ đi cho tới khi
 * dữ liệu mới về (`keepPreviousData`), không nháy skeleton. Danh sách cuộn ngang, thẻ rộng cố định. Rỗng và lỗi có trạng thái riêng ngay trong khối.
 */
function HomeNewArrivals({ tree }: { tree: CategoryTree | null }) {
  const tabs = allTabs.filter((tab) => !tab.categorySlug || hasCategory(tree, tab.categorySlug))
  const [selectedId, setSelectedId] = useState(allTabs[0].id)
  const selected = tabs.find((tab) => tab.id === selectedId) ?? tabs[0]
  const categoryId = selected.categorySlug ? tree?.bySlug.get(selected.categorySlug)?.id : undefined
  const query = useCatalogProducts({ sortBy: "createdAt", order: "desc", limit: HOME_NEW_ARRIVALS, categoryId })
  const items = query.data?.items
  const hasTabs = tabs.length > 1

  return (
    <HomeSection
      id="home-new-arrivals"
      eyebrow={eyebrow}
      title={title}
      action={
        hasTabs ? (
          <TabBar
            prefix={TAB_PREFIX}
            label="Lọc sản phẩm mới về"
            tabs={tabs}
            selectedId={selected.id}
            onSelect={setSelectedId}
          />
        ) : undefined
      }
    >
      <div
        {...(hasTabs
          ? { role: "tabpanel", id: panelDomId(TAB_PREFIX), "aria-labelledby": tabDomId(TAB_PREFIX, selected.id) }
          : {})}
        className="min-w-0"
      >
        {items === undefined ? (
          query.isError ? (
            <CatalogError onRetry={() => void query.refetch()} />
          ) : (
            <ProductStripSkeleton count={HOME_NEW_ARRIVALS} />
          )
        ) : items.length === 0 ? (
          <StateMessage
            icon={PackageOpen}
            title="Chưa có sản phẩm mới"
            description="Danh mục này chưa có sản phẩm. Hãy xem các danh mục khác hoặc quay lại sau."
          />
        ) : (
          <HScrollList label={`${title}, cuộn ngang`} busy={query.isPlaceholderData}>
            {items.map((product) => (
              <li key={product.id} className={STRIP_CARD_WIDTH}>
                <ProductCard product={product} />
              </li>
            ))}
          </HScrollList>
        )}
      </div>
    </HomeSection>
  )
}

export { HomeNewArrivals }
