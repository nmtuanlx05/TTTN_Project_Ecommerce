import type { ReactNode } from "react"

/** Tiêu đề một khối của trang (h2) và, nếu có, một liên kết phụ bên phải (vd. "Xem tất cả"). */
function SectionHeading({ id, title, action }: { id: string; title: string; action?: ReactNode }) {
  return (
    <div className="flex items-end justify-between gap-inline">
      <h2 id={id} className="text-h2 text-ink">
        {title}
      </h2>
      {action}
    </div>
  )
}

export { SectionHeading }
