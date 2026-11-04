import type { ReactNode } from "react"

/**
 * Đầu một khối của trang chủ: nhãn nhỏ phía trên (`eyebrow`, tùy chọn, serif nghiêng, viết đúng chữ trong dữ liệu — không đổi hoa/thường bằng CSS), tiêu đề h2 (`text-h1` viết hoa), mô tả phía dưới nếu có và một liên kết phụ
 * hoặc điều khiển bên phải (vd. "Xem tất cả", thanh tab).
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
        {eyebrow ? <p className="font-serif text-h3 font-normal text-ink-muted italic">{eyebrow}</p> : null}
        <h2 id={id} className="text-h1 uppercase text-ink">
          {title}
        </h2>
        {description ? <p className="max-w-prose text-body-sm text-ink-muted">{description}</p> : null}
      </div>
      {action}
    </div>
  )
}

export { SectionHeading }
