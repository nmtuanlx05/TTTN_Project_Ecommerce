import type { ReactNode } from "react"

/**
 * Đầu một khối của trang: tiêu đề h2, và nếu có thì nhãn nhỏ phía trên (`eyebrow`), mô tả phía dưới và một liên kết phụ bên phải (vd. "Xem tất cả").
 * Không có `eyebrow` thì giữ kiểu cũ (`text-h2`); có `eyebrow` là đầu khối trang chủ: tiêu đề `text-h1` viết hoa.
 */
function SectionHeading({
  id,
  title,
  eyebrow,
  description,
  action,
}: {
  id: string
  title: string
  eyebrow?: string
  description?: string
  action?: ReactNode
}) {
  return (
    <div className="flex flex-wrap items-end justify-between gap-x-inline gap-y-stack">
      <div className="flex min-w-0 flex-col gap-2">
        {eyebrow ? <p className="text-overline uppercase text-ink-muted">{eyebrow}</p> : null}
        <h2 id={id} className={eyebrow ? "text-h1 uppercase text-ink" : "text-h2 text-ink"}>
          {title}
        </h2>
        {description ? <p className="max-w-prose text-body-sm text-ink-muted">{description}</p> : null}
      </div>
      {action}
    </div>
  )
}

export { SectionHeading }
