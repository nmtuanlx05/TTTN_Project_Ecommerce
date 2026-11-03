import { useId } from "react"
import { Link } from "react-router-dom"
import { FOOTER_LINK } from "./footer-link-styles"

interface FooterLink {
  label: string
  href: string
}

/** Một cột liên kết của chân trang: tiêu đề `h2` (cũng là nhãn của `nav`) và danh sách liên kết. */
function FooterLinkColumn({ title, links }: { title: string; links: FooterLink[] }) {
  const titleId = useId()

  return (
    <nav aria-labelledby={titleId} className="flex flex-col gap-2">
      <h2 id={titleId} className="text-overline text-ink uppercase">
        {title}
      </h2>
      <ul className="flex flex-col items-start">
        {links.map((link) => (
          <li key={link.href}>
            <Link to={link.href} className={FOOTER_LINK}>
              {link.label}
            </Link>
          </li>
        ))}
      </ul>
    </nav>
  )
}

export { FooterLinkColumn }
export type { FooterLink }
