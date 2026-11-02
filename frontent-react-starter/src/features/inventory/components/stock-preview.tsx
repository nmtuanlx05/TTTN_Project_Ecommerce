import type { ReactNode } from "react"
import { Alert } from "@/components/ui/alert"

/**
 * Dòng xem trước tính phía client ("Tồn sau khi nhập: x"); server vẫn là nguồn đúng. `warning` là cảnh báo
 * không chặn (server có thể từ chối). Vùng live để người đọc màn hình biết số đã đổi khi đang gõ.
 */
function StockPreview({
  lines,
  warning,
}: {
  lines: { label: string; value: ReactNode }[]
  warning?: string | null
}) {
  return (
    <div className="flex flex-col gap-inline" aria-live="polite">
      <dl className="flex flex-col gap-1 rounded-md bg-surface-sunken p-card text-body-sm">
        {lines.map((line) => (
          <div key={line.label} className="flex items-center justify-between gap-inline">
            <dt className="text-ink-muted">{line.label}</dt>
            <dd className="font-semibold text-ink" data-numeric>
              {line.value}
            </dd>
          </div>
        ))}
      </dl>
      {warning ? <Alert variant="warning">{warning}</Alert> : null}
    </div>
  )
}

export { StockPreview }
