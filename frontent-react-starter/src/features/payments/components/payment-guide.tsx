import { STORE } from "@/lib/store-info"

const STEPS = [
  'Mở app ngân hàng, chọn "Quét mã QR" (hoặc chuyển khoản bằng mã QR).',
  "Quét mã bên cạnh rồi kiểm tra số tiền và nội dung đã được điền sẵn.",
  "Xác nhận chuyển khoản. Trang này tự cập nhật khi cửa hàng nhận được tiền.",
]

/** Cách liên hệ cửa hàng từ `STORE.contact` (chưa có thông tin thì nói chung, không bịa số). */
function contactText(): string {
  const { phone, email } = STORE.contact
  const parts = [phone, email].filter((item): item is string => Boolean(item))
  return parts.length > 0 ? `Liên hệ ${parts.join(" hoặc ")}` : "Liên hệ cửa hàng"
}

/** Hướng dẫn quét mã, lưu ý nội dung, gợi ý cho điện thoại và dòng liên hệ khi đã chuyển mà chưa thấy cập nhật. */
function PaymentGuide({ orderCode }: { orderCode: string }) {
  return (
    <div className="flex flex-col gap-4 text-body-sm text-ink-muted">
      <ol className="flex flex-col gap-2">
        {STEPS.map((step, index) => (
          <li key={step} className="flex gap-3">
            <span
              aria-hidden="true"
              className="grid size-6 shrink-0 place-items-center rounded-4xl bg-primary text-caption font-semibold text-primary-fg"
            >
              {index + 1}
            </span>
            <span className="pt-0.5">{step}</span>
          </li>
        ))}
      </ol>
      <p className="font-medium text-ink">Vui lòng không sửa nội dung chuyển khoản để đơn được xác nhận tự động.</p>
      <p>
        Đang dùng điện thoại? Hãy bấm &quot;Lưu ảnh QR&quot;, rồi trong app ngân hàng chọn quét mã từ ảnh trong thư viện.
      </p>
      <p>
        Đã chuyển khoản mà chưa thấy cập nhật? {contactText()} kèm mã đơn{" "}
        <strong data-numeric className="text-ink">
          {orderCode}
        </strong>
        .
      </p>
    </div>
  )
}

export { PaymentGuide }
