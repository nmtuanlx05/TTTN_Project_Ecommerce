import { useWatch, type Control } from "react-hook-form"
import { formatVnd } from "@/lib/format"
import { EXAMPLE_SUBTOTAL, previewDiscount } from "../discount-preview"
import type { VoucherFormValues } from "../schemas"

/** Dòng "Ví dụ minh họa" dưới form. Chỉ để hình dung; số tiền giảm thật do backend tính khi khách đặt đơn. */
function VoucherExample({ control }: { control: Control<VoucherFormValues> }) {
  const [discountType, discountValue, maxDiscount, minOrderValue] = useWatch({
    control,
    name: ["discountType", "discountValue", "maxDiscount", "minOrderValue"],
  })
  const preview = previewDiscount({ discountType, discountValue, maxDiscount, minOrderValue })
  const order = formatVnd(EXAMPLE_SUBTOTAL)

  return (
    <div className="rounded-md border border-border-subtle bg-surface-sunken p-card text-body-sm">
      <p className="text-caption font-semibold text-ink-muted uppercase">Ví dụ minh họa</p>
      <p aria-live="polite" className="mt-1 text-ink">
        {preview === null
          ? "Nhập giá trị giảm hợp lệ để xem ví dụ."
          : preview.kind === "below-min"
            ? `Đơn ${order} chưa đủ điều kiện (tối thiểu ${formatVnd(preview.minOrderValue)}).`
            : `Đơn ${order} sẽ được giảm ${formatVnd(preview.amount)}.`}
      </p>
    </div>
  )
}

export { VoucherExample }
