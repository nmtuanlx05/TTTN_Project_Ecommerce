import type { ReactNode } from "react"
import type { AdminOrder } from "../types"

function Row({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="flex flex-col gap-0.5">
      <dt className="text-caption text-ink-muted">{label}</dt>
      <dd className="text-body-sm text-ink">{children}</dd>
    </div>
  )
}

/** Khách hàng và nơi giao: người nhận, số điện thoại, địa chỉ ghép đủ, ghi chú của khách, người phụ trách. */
function OrderCustomerCard({ order }: { order: AdminOrder }) {
  const { shippingAddress: address, customer, customerEmail, handledBy } = order
  const email = customer?.email ?? customerEmail
  return (
    <section aria-labelledby="order-customer" className="flex flex-col gap-stack rounded-md border border-border-subtle bg-surface p-card">
      <h2 id="order-customer" className="font-display text-h3 text-ink">
        Khách hàng và giao hàng
      </h2>
      <dl className="grid gap-stack sm:grid-cols-2">
        <Row label="Người nhận">{address.receiverName}</Row>
        <Row label="Số điện thoại">
          <span data-numeric>{address.phone}</span>
        </Row>
        {customer ? <Row label="Tài khoản đặt đơn">{customer.name ? `${customer.name} · ` : ""}{customer.email}</Row> : null}
        {!customer && email ? <Row label="Email">{email}</Row> : null}
        <Row label="Người phụ trách đơn">{handledBy ? (handledBy.name ?? `#${handledBy.id}`) : "Chưa có"}</Row>
        <div className="sm:col-span-2">
          <Row label="Địa chỉ giao hàng">{address.fullAddress}</Row>
        </div>
        <div className="sm:col-span-2">
          <Row label="Ghi chú của khách">{address.note ?? "Không có"}</Row>
        </div>
      </dl>
    </section>
  )
}

export { OrderCustomerCard }
