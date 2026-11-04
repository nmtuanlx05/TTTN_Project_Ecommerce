import type { ReactNode } from "react"
import { infoPageHref, infoPageTitle } from "@/lib/info-pages"
import type { NavItem } from "@/lib/nav-items"
import { STORE } from "@/lib/store-info"
import { FooterBottomBar } from "./footer-bottom-bar"
import { FooterBrand } from "./footer-brand"
import { FooterLinkColumn } from "./footer-link-column"

/**
 * Chân trang bốn cột: giới thiệu + liên hệ, đường dẫn nhanh, chính sách khách hàng, đăng ký nhận tin; dưới cùng là dòng bản quyền.
 * Dưới 768px xếp dọc, từ 768px hai cột, từ 1024px bốn cột (cột đầu và cuối rộng hơn). Nền tối cố định nhờ class `dark`
 * (vùng tối cố định: dùng bộ token tối trong phạm vi chân trang, không thêm token mới). `soft-ui`: ô email và nút "ĐĂNG KÝ" bo theo `control`, nút đảo màu khi hover.
 *
 * `quickLinks` là các mục điều hướng đã đối chiếu với cây danh mục (cùng nguồn với header, nên mục danh mục chỉ hiện khi danh mục
 * tồn tại). `newsletter` là form nhận tin do nơi dựng khung truyền vào (components/ không import features/).
 */
function StorefrontFooter({ quickLinks = [], newsletter }: { quickLinks?: NavItem[]; newsletter?: ReactNode }) {
  const { footer } = STORE
  const quickLinkItems = [
    footer.quickLinksLead,
    ...quickLinks.map(({ label, href }) => ({ label, href })),
  ]
  const policyLinks = footer.policySlugs.map((slug) => ({ label: infoPageTitle(slug), href: infoPageHref(slug) }))

  return (
    <footer className="dark soft-ui border-t border-border-strong bg-surface-sunken text-ink">
      <div className="mx-auto w-full max-w-7xl px-gutter pt-12 pb-8 lg:pt-16">
        <div className="grid gap-10 md:grid-cols-2 lg:grid-cols-[5fr_4fr_4fr_5fr]">
          <FooterBrand />
          <FooterLinkColumn title={footer.quickLinksTitle} links={quickLinkItems} />
          <FooterLinkColumn title={footer.policiesTitle} links={policyLinks} />
          <section aria-labelledby="footer-newsletter" className="flex flex-col gap-stack">
            <h2 id="footer-newsletter" className="text-overline text-ink uppercase">
              {STORE.newsletter.title}
            </h2>
            <p className="max-w-sm text-body-sm text-ink-muted">{STORE.newsletter.description}</p>
            {newsletter}
          </section>
        </div>
        <FooterBottomBar />
      </div>
    </footer>
  )
}

export { StorefrontFooter }
