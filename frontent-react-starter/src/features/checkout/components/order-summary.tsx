import { ArrowLeft } from "lucide-react"
import { Link } from "react-router-dom"
import { Button } from "@/components/ui/button"
import { formatVnd } from "@/lib/format"
import { infoPageHref } from "@/lib/info-pages"
import { cn } from "@/lib/utils"
import type { OrderPreview } from "../types"
import { SummaryLine } from "./summary-line"
import { VoucherBox } from "./voucher-box"
import { VoucherSuggestions } from "./voucher-suggestions"

const LINK = "underline underline-offset-4 hover:text-ink"

function Row({ label, value, strong }: { label: string; value: string; strong?: boolean }) {
  return (
    <div className="flex justify-between gap-3">
      <dt className={strong ? "text-ink" : "text-ink-muted"}>{label}</dt>
      <dd data-numeric className="text-ink">
        {value}
      </dd>
    </div>
  )
}

/**
 * Thẻ "Tóm tắt đơn hàng" (nền be, dính theo khi cuộn từ `lg`): dòng hàng, mã giảm giá, các dòng tiền, nút "Đặt hàng". Mọi số tiền lấy nguyên từ xem trước của backend,
 * giao diện không tự tính. Nút gửi form bên trái qua thuộc tính `form`. `refreshing`: đang tính lại (đổi voucher) thì mờ phần tiền.
 */
function OrderSummary({
  preview,
  formId,
  refreshing,
  pending,
  canSubmit,
  voucherError,
  applying,
  onApply,
  onRemove,
}: {
  preview: OrderPreview
  formId: string
  refreshing: boolean
  pending: boolean
  canSubmit: boolean
  voucherError: string | null
  applying: boolean
  onApply: (code: string) => void
  onRemove: () => void
}) {
  const { voucher } = preview
  return (
    <aside
      aria-label="Tóm tắt đơn hàng"
      className="flex flex-col gap-5 self-start rounded-panel bg-surface-sunken/50 p-6 sm:p-8 lg:sticky lg:top-(--sticky-top)"
    >
      <div className="flex items-baseline justify-between gap-3">
        <h2 className="text-h3 font-semibold text-ink">Tóm tắt đơn hàng</h2>
        <Link to="/gio-hang" className="text-body-sm text-ink-muted underline underline-offset-4 hover:text-ink">
          Chỉnh sửa
        </Link>
      </div>
      <ul className="flex flex-col gap-4 border-b border-border-default pb-5">
        {preview.items.map((item) => (
          <SummaryLine key={item.id} item={item} />
        ))}
      </ul>
      <VoucherBox applied={voucher} error={voucherError} busy={applying} onApply={onApply} onRemove={onRemove} />
      <VoucherSuggestions
        subtotal={preview.subtotal}
        appliedCode={voucher?.code ?? null}
        busy={applying}
        onApply={onApply}
      />
      <dl
        aria-busy={refreshing}
        className={cn(
          "flex flex-col gap-2 border-t border-border-default pt-5 text-body-sm",
          refreshing && "opacity-60",
        )}
      >
        <Row label="Tạm tính" value={formatVnd(preview.subtotal)} />
        {preview.discountAmount > 0 ? (
          <Row
            label={`Giảm giá${voucher ? ` (${voucher.code})` : ""}`}
            value={`- ${formatVnd(preview.discountAmount)}`}
          />
        ) : null}
        <Row label="Vận chuyển" value={preview.shippingFee === 0 ? "Miễn phí" : formatVnd(preview.shippingFee)} />
        <div className="mt-2 flex items-baseline justify-between gap-3">
          <dt className="font-semibold text-ink">Tổng cộng</dt>
          <dd data-numeric className="text-h2 font-semibold text-ink">
            {formatVnd(preview.totalAmount)}
          </dd>
        </div>
      </dl>
      <Button
        type="submit"
        form={formId}
        size="lg"
        loading={pending}
        disabled={!canSubmit || pending}
        className="press w-full rounded-4xl"
      >
        {pending ? "Đang đặt hàng..." : "Đặt hàng"}
      </Button>
      <p className="text-center text-caption text-ink-muted">
        Bằng việc đặt hàng, bạn đồng ý với{" "}
        <Link to={infoPageHref("dieu-khoan")} className={LINK}>
          Điều khoản
        </Link>{" "}
        và{" "}
        <Link to={infoPageHref("bao-mat")} className={LINK}>
          Chính sách bảo mật
        </Link>{" "}
        của MONO STUDIO.
      </p>
      <Link
        to="/gio-hang"
        className="flex items-center justify-center gap-2 text-body-sm text-ink-muted hover:text-ink"
      >
        <ArrowLeft className="size-4" aria-hidden="true" />
        Quay lại giỏ hàng
      </Link>
    </aside>
  )
}

export { OrderSummary }
