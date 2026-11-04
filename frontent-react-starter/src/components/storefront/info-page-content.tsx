import { Link } from "react-router-dom"
import { FileText } from "lucide-react"
import { StateMessage } from "@/components/storefront/state-message"
import { buttonVariants } from "@/components/ui/button"
import type { InfoPage } from "@/lib/info-pages"
import { PageContainer } from "@/components/storefront/page-container"

/**
 * Nội dung một trang thông tin (chính sách, hướng dẫn...): đúng một `h1` (viết hoa như các trang khác) rồi các đoạn văn.
 * Chưa có đoạn nào thì hiện "Nội dung đang được cập nhật" thay vì bịa chính sách.
 */
function InfoPageContent({ page }: { page: InfoPage }) {
  const paragraphs = page.paragraphs ?? []

  return (
    <PageContainer className="pt-8 pb-block lg:pt-16">
      <h1 className="mb-8 text-h1 text-ink uppercase">{page.title}</h1>
      {paragraphs.length > 0 ? (
        <div className="flex max-w-prose flex-col gap-stack">
          {paragraphs.map((paragraph) => (
            <p key={paragraph} className="text-body text-ink-muted">
              {paragraph}
            </p>
          ))}
        </div>
      ) : (
        <StateMessage
          icon={FileText}
          title="Nội dung đang được cập nhật"
          description="Chúng tôi đang hoàn thiện trang này. Bạn vui lòng quay lại sau."
          action={
            <Link to="/" className={buttonVariants({ variant: "secondary" })}>
              Về trang chủ
            </Link>
          }
        />
      )}
    </PageContainer>
  )
}

export { InfoPageContent }
