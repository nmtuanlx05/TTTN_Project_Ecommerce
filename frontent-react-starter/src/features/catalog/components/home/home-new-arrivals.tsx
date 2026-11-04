import { useState } from "react"
import { CircleAlert, PackageOpen } from "lucide-react"
import { HScrollList } from "@/components/storefront/hscroll-list"
import { PageContainer } from "@/components/storefront/page-container"
import { Reveal } from "@/components/storefront/reveal"
import { SectionHeading } from "@/components/storefront/section-heading"
import { StateMessage } from "@/components/storefront/state-message"
import { TabBar } from "@/components/storefront/tab-bar"
import { Button } from "@/components/ui/button"
import type { CategoryTree } from "@/lib/category-tree"
import { HOME } from "@/lib/home-content"
import { hasCategory } from "@/lib/home-links"
import { panelDomId, tabDomId } from "@/lib/tab-ids"
import { HOME_NEW_ARRIVALS, STRIP_CARD_WIDTH } from "../../home-constants"
import { useCatalogProducts } from "../../queries"
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
    <Reveal className="mt-block">
      <PageContainer>
        <section aria-labelledby="home-new-arrivals" className="flex flex-col gap-8">
          <SectionHeading
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
          />
          <div
            {...(hasTabs
              ? { role: "tabpanel", id: panelDomId(TAB_PREFIX), "aria-labelledby": tabDomId(TAB_PREFIX, selected.id) }
              : {})}
            className="min-w-0"
          >
            {items === undefined ? (
              query.isError ? (
                <StateMessage
                  icon={CircleAlert}
                  title="Không tải được sản phẩm"
                  description="Kết nối bị gián đoạn hoặc máy chủ đang bận. Thử lại sau giây lát."
                  action={
                    <Button variant="secondary" onClick={() => void query.refetch()}>
                      Thử lại
                    </Button>
                  }
                />
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
        </section>
      </PageContainer>
    </Reveal>
  )
}

export { HomeNewArrivals }
