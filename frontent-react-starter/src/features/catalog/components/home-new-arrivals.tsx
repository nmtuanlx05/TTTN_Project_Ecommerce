import { Link } from "react-router-dom"
import { CircleAlert, PackageOpen } from "lucide-react"
import { SectionHeading } from "@/components/storefront/section-heading"
import { StateMessage } from "@/components/storefront/state-message"
import { Button } from "@/components/ui/button"
import { STORE } from "@/lib/store-info"
import { HOME_NEW_ARRIVALS } from "../constants"
import { useCatalogProducts } from "../queries"
import { ProductGrid } from "./product-grid"
import { ProductGridSkeleton } from "./product-grid-skeleton"

/**
 * "Sản phẩm mới": 8 sản phẩm mới nhất, đúng thẻ của trang danh sách (2 cột di động, 4 cột từ `lg`), có liên kết "Xem tất cả".
 * Nằm dưới màn hình đầu nên không thẻ nào `eager`. Dùng chung request với hero. Skeleton đúng tỉ lệ; chưa có sản phẩm hoặc lỗi
 * thì hiện trạng thái rõ ràng (lỗi có "Thử lại").
 */
function HomeNewArrivals() {
  const query = useCatalogProducts({ limit: HOME_NEW_ARRIVALS })
  const items = query.data?.items

  return (
    <section aria-labelledby="home-new-arrivals" className="flex flex-col gap-8">
      <SectionHeading
        id="home-new-arrivals"
        title={STORE.home.newArrivalsTitle}
        action={
          <Link
            to="/products"
            className="inline-flex min-h-control items-center text-body-sm text-ink underline underline-offset-4 transition-colors duration-(--motion-fast) ease-smooth hover:text-ink-muted"
          >
            {STORE.home.viewAll}
          </Link>
        }
      />
      {items === undefined ? (
        query.isError ? (
          <StateMessage
            icon={CircleAlert}
            title="Không tải được sản phẩm"
            description="Kết nối bị gián đoạn hoặc máy chủ đang bận. Thử lại sau giây lát."
            action={<Button variant="secondary" onClick={() => void query.refetch()}>Thử lại</Button>}
          />
        ) : (
          <ProductGridSkeleton layout="full" count={HOME_NEW_ARRIVALS} />
        )
      ) : items.length === 0 ? (
        <StateMessage
          icon={PackageOpen}
          title="Chưa có sản phẩm"
          description="Bộ sưu tập đang được hoàn thiện. Hãy quay lại sau."
        />
      ) : (
        <ProductGrid products={items} layout="full" eagerCount={0} />
      )}
    </section>
  )
}

export { HomeNewArrivals }
