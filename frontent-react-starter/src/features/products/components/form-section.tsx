import type { ReactNode } from "react"

/** Một khối của form dài: tiêu đề, mô tả ngắn và các ô nhập. */
function FormSection({
  title,
  description,
  children,
}: {
  title: string
  description?: string
  children: ReactNode
}) {
  return (
    <section className="flex flex-col gap-stack rounded-md border border-border-subtle bg-surface p-card">
      <div className="flex flex-col gap-1">
        <h2 className="font-display text-h3 text-ink">{title}</h2>
        {description ? <p className="text-body-sm text-ink-muted">{description}</p> : null}
      </div>
      {children}
    </section>
  )
}

export { FormSection }
