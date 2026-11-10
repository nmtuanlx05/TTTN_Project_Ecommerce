import { Check, Copy } from "lucide-react"
import { useEffect, useRef, useState } from "react"
import { Button } from "@/components/ui/button"
import { useToast } from "@/components/ui/toast"
import { cn } from "@/lib/utils"
import { copyText } from "../clipboard"

/**
 * Một dòng thông tin chuyển khoản: nhãn nhỏ, giá trị, và (nếu có `copyValue`) nút sao chép. Sao chép lỗi thì báo để khách chép tay.
 * `highlight`: dòng quan trọng (số tiền, nội dung) chữ to hơn.
 */
function PaymentCopyRow({
  label,
  value,
  copyValue,
  copyLabel,
  highlight,
}: {
  label: string
  value: string
  /** Giá trị đưa vào bộ nhớ tạm khi bấm (mặc định chính `value`); bỏ trống kèm `copyLabel` để không có nút. */
  copyValue?: string
  copyLabel?: string
  highlight?: boolean
}) {
  const toast = useToast()
  const [copied, setCopied] = useState(false)
  const timer = useRef<number | undefined>(undefined)
  useEffect(() => () => window.clearTimeout(timer.current), [])

  const copy = async () => {
    const ok = await copyText(copyValue ?? value)
    if (!ok) {
      toast.add({ title: "Không sao chép được, hãy chọn và chép thủ công", data: { tone: "danger" } })
      return
    }
    setCopied(true)
    window.clearTimeout(timer.current)
    timer.current = window.setTimeout(() => setCopied(false), 2_000)
    toast.add({ title: `Đã sao chép ${label.toLowerCase()}`, data: { tone: "success" } })
  }

  return (
    <div className="flex items-center justify-between gap-3 border-b border-border-subtle py-3 last:border-b-0">
      <div className="flex min-w-0 flex-col gap-0.5">
        <dt className="text-caption text-ink-muted">{label}</dt>
        <dd data-numeric className={cn("font-medium break-all text-ink", highlight ? "text-h3" : "text-body-sm")}>
          {value}
        </dd>
      </div>
      {copyLabel ? (
        <Button
          type="button"
          variant="secondary"
          size="sm"
          aria-label={copyLabel}
          onClick={() => void copy()}
          className="press shrink-0 rounded-4xl"
        >
          {copied ? <Check aria-hidden="true" /> : <Copy aria-hidden="true" />}
          {copied ? "Đã chép" : "Sao chép"}
        </Button>
      ) : null}
    </div>
  )
}

export { PaymentCopyRow }
