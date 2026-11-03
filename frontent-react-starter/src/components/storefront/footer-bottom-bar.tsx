import { Link } from "react-router-dom"
import { infoPageHref } from "@/lib/info-pages"
import { STORE } from "@/lib/store-info"
import { FOOTER_LINK } from "./footer-link-styles"

/** Dòng cuối chân trang: bản quyền (năm lấy từ ngày hiện tại) và các liên kết pháp lý. */
function FooterBottomBar() {
  return (
    <div className="mt-12 flex flex-col gap-2 border-t border-border-subtle pt-6 md:flex-row md:items-center md:justify-between">
      <p className="text-caption text-ink-muted">
        Bản quyền © {new Date().getFullYear()} {STORE.name}.
      </p>
      <nav aria-label="Điều khoản và bảo mật">
        <ul className="flex items-center gap-4">
          {STORE.footer.legalLinks.map((link) => (
            <li key={link.slug}>
              <Link to={infoPageHref(link.slug)} className={FOOTER_LINK}>
                {link.label}
              </Link>
            </li>
          ))}
        </ul>
      </nav>
    </div>
  )
}

export { FooterBottomBar }
