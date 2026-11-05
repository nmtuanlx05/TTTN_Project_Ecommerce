import { useId, useState } from "react"
import { Ticket, X } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import type { PreviewVoucher } from "../types"
import { voucherTitle } from "../voucher-text"

/**
 * Khối "MÃ GIẢM GIÁ": ô nhập + "Áp dụng"; đã áp dụng thì hiện "Đã áp dụng · Giảm 10%" kèm nút gỡ. Lỗi (`error`, tiếng Việt từ backend) nằm ngay dưới ô nhập
 * và trạng thái trước đó được giữ nguyên.
 */
function VoucherBox({
  applied,
  error,
  busy,
  onApply,
  onRemove,
}: {
  applied: PreviewVoucher | null
  error: string | null
  busy: boolean
  onApply: (code: string) => void
  onRemove: () => void
}) {
  const id = useId()
  const [code, setCode] = useState("")

  return (
    <div className="flex flex-col gap-2">
      <p className="text-overline uppercase text-ink">Mã giảm giá</p>
      {applied ? (
        <div className="flex items-center gap-3 rounded-card border border-border-control bg-surface-raised p-3">
          <Ticket className="size-4 shrink-0 text-ink-muted" aria-hidden="true" />
          <div className="flex min-w-0 flex-1 flex-col">
            <p data-numeric className="text-body-sm font-semibold text-ink">
              {applied.code}
            </p>
            <p className="text-caption text-ink-muted">Đã áp dụng · {voucherTitle(applied)}</p>
          </div>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            aria-label={`Gỡ mã ${applied.code}`}
            onClick={onRemove}
            className="press"
          >
            <X className="size-4" aria-hidden="true" />
          </Button>
        </div>
      ) : null}
      <form
        onSubmit={(event) => {
          event.preventDefault()
          const value = code.trim()
          if (value && !busy) onApply(value)
        }}
        className="flex gap-2"
      >
        <Input
          id={id}
          aria-label="Nhập mã giảm giá"
          aria-invalid={error ? true : undefined}
          aria-describedby={error ? `${id}-error` : undefined}
          value={code}
          onChange={(event) => setCode(event.target.value)}
          placeholder={applied ? "Nhập mã khác" : "Nhập mã giảm giá"}
          autoCapitalize="characters"
          spellCheck={false}
        />
        <Button
          type="submit"
          variant="secondary"
          loading={busy}
          disabled={code.trim() === ""}
          className="press shrink-0 rounded-4xl"
        >
          Áp dụng
        </Button>
      </form>
      {error ? (
        <p id={`${id}-error`} role="alert" className="text-caption text-danger-fg">
          {error}
        </p>
      ) : null}
    </div>
  )
}

export { VoucherBox }
