import { mergeProps } from "@base-ui/react/merge-props"
import { useRender } from "@base-ui/react/use-render"
import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "@/lib/utils"

/**
 * Badge trạng thái.
 *
 * Nguyên tắc: độ đậm của mực tăng dần theo tiến độ đơn hàng
 * (PENDING nhạt nhất → COMPLETED đậm nhất). Nhờ vậy 7 trạng thái phân biệt
 * được cả khi in đen trắng, không chỉ khác nhau về sắc độ.
 *
 * Hai nhánh phụ tách khỏi thang bằng HÌNH THỨC chứ không chỉ bằng tông:
 * CANCELLED là badge rỗng (chỉ có viền) — không có gì xảy ra thì không có mực.
 * UNPAID cũng dùng hình thức rỗng này ở cột thanh toán.
 */
const badgeVariants = cva(
  [
    "inline-flex w-fit shrink-0 items-center justify-center gap-1",
    "rounded-4xl border border-transparent px-2.5 py-0.5",
    "text-caption font-medium whitespace-nowrap",
    "outline-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring",
    "[&>svg]:pointer-events-none [&>svg]:size-3",
  ],
  {
    variants: {
      variant: {
        // --- Trung tính ---
        neutral: "bg-surface-sunken text-ink",
        outline: "border-border-strong bg-transparent text-ink-muted",
        solid: "bg-primary text-primary-fg",

        // --- 7 trạng thái đơn hàng ---
        pending: "bg-status-pending-bg text-status-pending-fg",
        confirmed: "bg-status-confirmed-bg text-status-confirmed-fg",
        packing: "bg-status-packing-bg text-status-packing-fg",
        shipping: "bg-status-shipping-bg text-status-shipping-fg",
        completed: "bg-status-completed-bg text-status-completed-fg",
        returned: "bg-status-returned-bg text-status-returned-fg",
        cancelled:
          "border-status-cancelled-border bg-transparent text-status-cancelled-fg",

        // --- 3 trạng thái thanh toán ---
        unpaid:
          "border-payment-unpaid-border bg-transparent text-payment-unpaid-fg",
        paid: "bg-payment-paid-bg text-payment-paid-fg",
        refunded: "bg-payment-refunded-bg text-payment-refunded-fg",
      },
    },
    defaultVariants: {
      variant: "neutral",
    },
  }
)

/** Trạng thái đơn hàng theo prisma/schema.prisma */
export type OrderStatus =
  | "PENDING"
  | "CONFIRMED"
  | "PACKING"
  | "SHIPPING"
  | "COMPLETED"
  | "CANCELLED"
  | "RETURNED"

/** Trạng thái thanh toán theo prisma/schema.prisma */
export type PaymentStatus = "UNPAID" | "PAID" | "REFUNDED"

const ORDER_STATUS: Record<
  OrderStatus,
  { label: string; variant: VariantProps<typeof badgeVariants>["variant"] }
> = {
  PENDING: { label: "Chờ xác nhận", variant: "pending" },
  CONFIRMED: { label: "Đã xác nhận", variant: "confirmed" },
  PACKING: { label: "Đang đóng gói", variant: "packing" },
  SHIPPING: { label: "Đang giao", variant: "shipping" },
  COMPLETED: { label: "Đã giao", variant: "completed" },
  CANCELLED: { label: "Đã hủy", variant: "cancelled" },
  RETURNED: { label: "Trả hàng", variant: "returned" },
}

const PAYMENT_STATUS: Record<
  PaymentStatus,
  { label: string; variant: VariantProps<typeof badgeVariants>["variant"] }
> = {
  UNPAID: { label: "Chưa thanh toán", variant: "unpaid" },
  PAID: { label: "Đã thanh toán", variant: "paid" },
  REFUNDED: { label: "Đã hoàn tiền", variant: "refunded" },
}

function Badge({
  className,
  variant,
  render = <span />,
  ...props
}: useRender.ComponentProps<"span"> & VariantProps<typeof badgeVariants>) {
  return useRender({
    render,
    props: mergeProps<"span">(
      { className: cn(badgeVariants({ variant }), className) },
      props
    ),
  })
}

/** Badge trạng thái đơn hàng — tự tra nhãn tiếng Việt và biến thể màu. */
function OrderStatusBadge({
  status,
  className,
}: {
  status: OrderStatus
  className?: string
}) {
  const { label, variant } = ORDER_STATUS[status]
  return (
    <Badge variant={variant} className={className}>
      {label}
    </Badge>
  )
}

/** Badge trạng thái thanh toán. */
function PaymentStatusBadge({
  status,
  className,
}: {
  status: PaymentStatus
  className?: string
}) {
  const { label, variant } = PAYMENT_STATUS[status]
  return (
    <Badge variant={variant} className={className}>
      {label}
    </Badge>
  )
}

export {
  Badge,
  badgeVariants,
  OrderStatusBadge,
  PaymentStatusBadge,
  ORDER_STATUS,
  PAYMENT_STATUS,
}
