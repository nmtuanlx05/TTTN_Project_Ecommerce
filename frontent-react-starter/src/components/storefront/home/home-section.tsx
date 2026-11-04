import type { ReactNode } from "react"
import { PageContainer } from "@/components/storefront/page-container"
import { Reveal } from "@/components/storefront/reveal"
import { SectionHeading } from "@/components/storefront/section-heading"

/**
 * Bộ khung chung của một khối trang chủ có tiêu đề (danh mục nổi bật, best sellers, sản phẩm mới về): hiện dần khi cuộn (`Reveal`), cách khối trên
 * bằng `mt-block`, nằm trong `PageContainer`, một `section` có nhãn là tiêu đề của chính nó, rồi nội dung. Khối nào rỗng thì trả `null` TRƯỚC khi dựng
 * khung này để không để lại khoảng trống. Dải câu chuyện và dải cam kết có bố cục riêng (toàn chiều rộng) nên không dùng khung này.
 */
function HomeSection({
  id,
  eyebrow,
  title,
  description,
  action,
  children,
}: {
  /** Id của tiêu đề, cũng là nhãn của `section` (`aria-labelledby`). */
  id: string
  eyebrow: string
  title: string
  description?: string
  action?: ReactNode
  children: ReactNode
}) {
  return (
    <Reveal className="mt-block">
      <PageContainer>
        <section aria-labelledby={id} className="flex flex-col gap-8">
          <SectionHeading id={id} eyebrow={eyebrow} title={title} description={description} action={action} />
          {children}
        </section>
      </PageContainer>
    </Reveal>
  )
}

export { HomeSection }
