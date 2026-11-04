import { PageContainer } from "@/components/storefront/page-container"
import { Reveal } from "@/components/storefront/reveal"
import { HOME } from "@/lib/home-content"
import { AssuranceItem } from "./assurance-item"

/**
 * Dải cam kết: nền dịu (`surface`) kẻ mảnh hai cạnh, 4 ô biểu tượng + tiêu đề + mô tả (4 cột từ `lg`, 2×2 ở `md`, 1 cột ở di động). Đứng giữa
 * "Sản phẩm mới về" và chân trang, KHÔNG thuộc chân trang. Nội dung là cam kết mẫu chờ xác nhận (`lib/home-content.ts`).
 */
function AssuranceStrip() {
  return (
    <Reveal className="mt-block">
      <section aria-label="Cam kết của cửa hàng" className="border-y border-border-subtle bg-surface">
        <PageContainer className="py-10 lg:py-12">
          <ul className="grid gap-8 md:grid-cols-2 lg:grid-cols-4">
            {HOME.assurances.map((item) => (
              <AssuranceItem key={item.title} item={item} />
            ))}
          </ul>
        </PageContainer>
      </section>
    </Reveal>
  )
}

export { AssuranceStrip }
