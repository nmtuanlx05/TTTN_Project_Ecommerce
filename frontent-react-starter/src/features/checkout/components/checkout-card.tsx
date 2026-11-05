import type { ReactNode } from "react"

/** Thẻ bo lớn bên trái trang thanh toán, đầu mục đánh số tròn đen. */
function CheckoutCard({ step, title, children }: { step: number; title: string; children: ReactNode }) {
  return (
    <section
      aria-labelledby={`checkout-step-${step}`}
      className="rounded-panel border border-border-subtle bg-surface-raised p-6 sm:p-8"
    >
      <h2 id={`checkout-step-${step}`} className="mb-6 flex items-center gap-3 text-h3 font-semibold text-ink">
        <span
          aria-hidden="true"
          className="grid size-6 place-items-center rounded-4xl bg-primary text-caption font-semibold text-primary-fg"
        >
          {step}
        </span>
        {title}
      </h2>
      {children}
    </section>
  )
}

export { CheckoutCard }
