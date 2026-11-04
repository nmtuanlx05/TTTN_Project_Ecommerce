import { PageContainer } from "@/components/storefront/page-container"
import { Reveal } from "@/components/storefront/reveal"
import { HOME } from "@/lib/home-content"
import { AssuranceItem } from "./assurance-item"

/**
 * Dải cam kết: THẺ bo góc `panel` trong khung nội dung, nền `surface-sunken` mờ 50% (sậm hơn nền trang một bậc như thiết kế mẫu; chữ phụ `ink-muted` đã đo ≥ 4,5:1),
 * 4 ô biểu tượng canh trái + tiêu đề + mô tả (4 cột từ `lg`, 2×2 ở `md`, 1 cột ở di động). Đứng giữa "Sản phẩm mới về" và chân trang, KHÔNG thuộc chân trang.
 * Nội dung là cam kết mẫu chờ xác nhận (`lib/home-content.ts`).
 */
function AssuranceStrip() {
  return (
    <Reveal className="my-block">
      <PageContainer>
        <section aria-label="Cam kết của cửa hàng" className="rounded-panel bg-surface-sunken/50 p-8 lg:p-12">
          <ul className="grid gap-8 md:grid-cols-2 lg:grid-cols-4">
            {HOME.assurances.map((item) => (
              <AssuranceItem key={item.title} item={item} />
            ))}
          </ul>
        </section>
      </PageContainer>
    </Reveal>
  )
}

export { AssuranceStrip }
