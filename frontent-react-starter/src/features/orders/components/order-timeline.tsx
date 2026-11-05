import { cn } from "@/lib/utils"
import { formatDate, formatTime } from "@/lib/format"
import type { Order, OrderStatus } from "../types"

/** Chuỗi bước của một đơn bình thường (PENDING_PAYMENT gộp vào bước đầu). */
const FLOW = ["PENDING", "CONFIRMED", "SHIPPING", "COMPLETED"] as const

const STEP_LABEL: Record<(typeof FLOW)[number], string> = {
  PENDING: "Đã đặt hàng",
  CONFIRMED: "Đã xác nhận",
  SHIPPING: "Đang giao hàng",
  COMPLETED: "Giao thành công",
}

interface Step {
  key: string
  label: string
  /** `null` = bước chưa tới (chỉ có ở đơn đang tiến hành). */
  at: string | null
  note?: string
  tone: "done" | "danger" | "upcoming"
}

/**
 * Các bước hiện trên mốc thời gian, suy từ `history`: chỉ bước ĐÃ XẢY RA. Đơn đang tiến hành mới thêm các bước chưa tới (mờ);
 * đơn đã hủy/trả hàng dừng ở bước kết thúc (thời điểm, lý do), không có bước sau. Người hủy chỉ là "Khách tự hủy" hoặc "Cửa hàng hủy".
 */
function buildSteps(order: Order): Step[] {
  const at = (status: OrderStatus) => order.history.find((entry) => entry.toStatus === status)
  const steps: Step[] = []
  let reached = -1
  FLOW.forEach((status, index) => {
    const entry = at(status) ?? (status === "PENDING" ? at("PENDING_PAYMENT") : undefined)
    // Đơn tạo ra luôn qua bước đầu; thiếu history (đơn rất cũ) thì lấy giờ tạo đơn.
    const time = entry?.createdAt ?? (status === "PENDING" ? order.createdAt : undefined)
    if (!time) return
    reached = index
    steps.push({ key: status, label: STEP_LABEL[status], at: time, tone: "done" })
  })

  if (order.status === "CANCELLED" || order.status === "RETURNED") {
    const entry = at(order.status)
    if (order.status === "CANCELLED") {
      const reason = entry?.reason ?? order.cancelReason
      const who = entry?.byRole === "CUSTOMER" ? "Khách tự hủy" : "Cửa hàng hủy"
      steps.push({
        key: "CANCELLED",
        label: "Đã hủy",
        at: entry?.createdAt ?? null,
        note: reason ? `${who}: ${reason}` : who,
        tone: "danger",
      })
    } else {
      steps.push({ key: "RETURNED", label: "Trả hàng", at: entry?.createdAt ?? null, tone: "danger" })
    }
    return steps
  }

  for (let index = reached + 1; index < FLOW.length; index++) {
    steps.push({ key: FLOW[index], label: STEP_LABEL[FLOW[index]], at: null, tone: "upcoming" })
  }
  return steps
}

/** Mốc thời gian trạng thái của đơn (danh sách dọc có đường nối). */
function OrderTimeline({ order }: { order: Order }) {
  const steps = buildSteps(order)
  return (
    <ol aria-label="Tiến trình đơn hàng" className="flex flex-col">
      {steps.map((step, index) => (
        <li key={step.key} className="relative flex gap-4 pb-6 last:pb-0">
          {index < steps.length - 1 ? (
            <span aria-hidden="true" className="absolute top-5 bottom-0 left-[0.4375rem] w-px bg-border-default" />
          ) : null}
          <span
            aria-hidden="true"
            className={cn(
              "relative mt-1 size-4 shrink-0 rounded-4xl border-2",
              step.tone === "done" && "border-primary bg-primary",
              step.tone === "danger" && "border-danger-fg bg-danger-fg",
              step.tone === "upcoming" && "border-border-strong bg-surface-raised",
            )}
          />
          <div className="flex min-w-0 flex-col gap-0.5">
            <p className={cn("text-body-sm font-semibold", step.tone === "upcoming" ? "text-ink-subtle" : "text-ink")}>
              {step.label}
              {step.tone === "upcoming" ? <span className="sr-only"> (chưa tới)</span> : null}
            </p>
            {step.at ? (
              <p className="text-body-sm text-ink-muted">
                {formatDate(step.at)} · {formatTime(step.at)}
              </p>
            ) : null}
            {step.note ? <p className="text-body-sm text-danger-fg">{step.note}</p> : null}
          </div>
        </li>
      ))}
    </ol>
  )
}

export { OrderTimeline }
