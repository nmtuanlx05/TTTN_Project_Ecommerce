import { useState } from "react"
import { SearchInput } from "@/components/admin/search-input"
import { formatVnd } from "@/lib/format"
import { cn } from "@/lib/utils"
import { useAwaitingOrders } from "../queries"
import type { AwaitingOrder, ConfirmOrderTarget } from "../types"

/**
 * Ô tìm đơn đang chờ thanh toán (theo mã, số điện thoại hoặc tên) cho giao dịch không khớp đơn nào. Chọn một đơn để gắn giao dịch vào.
 * Chỉ liệt kê đơn `PENDING_PAYMENT`; backend vẫn kiểm lại khi xác nhận.
 */
function AwaitingOrderPicker({
  picked,
  onPick,
}: {
  picked: ConfirmOrderTarget | null
  onPick: (order: AwaitingOrder) => void
}) {
  const [q, setQ] = useState("")
  const search = useAwaitingOrders(q)

  return (
    <div className="flex flex-col gap-2">
      <p className="text-body-sm font-medium text-ink">Chọn đơn đang chờ thanh toán</p>
      <SearchInput value={q} onSearch={setQ} placeholder="Mã đơn, số điện thoại hoặc tên khách" label="Tìm đơn chờ thanh toán" />
      {q.length < 2 ? (
        <p className="text-caption text-ink-muted">Nhập ít nhất 2 ký tự để tìm.</p>
      ) : search.isPending ? (
        <p className="text-caption text-ink-muted" role="status">
          Đang tìm…
        </p>
      ) : search.isError ? (
        <p className="text-caption text-danger-fg" role="alert">
          {search.error.message}
        </p>
      ) : search.data.length === 0 ? (
        <p className="text-caption text-ink-muted">Không có đơn nào đang chờ thanh toán khớp từ khóa.</p>
      ) : (
        <ul className="flex flex-col gap-1">
          {search.data.map((order) => (
            <li key={order.id}>
              <button
                type="button"
                aria-pressed={picked?.id === order.id}
                onClick={() => onPick(order)}
                className={cn(
                  "flex w-full items-center justify-between gap-3 rounded-md border px-3 py-2 text-left text-body-sm",
                  "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring",
                  picked?.id === order.id ? "border-ink bg-surface-sunken" : "border-border-subtle hover:bg-surface-hover",
                )}
              >
                <span className="flex min-w-0 flex-col">
                  <span data-numeric className="font-medium text-ink">
                    {order.code}
                  </span>
                  <span className="truncate text-caption text-ink-muted">
                    {order.customerName} · {order.customerPhone}
                  </span>
                </span>
                <span data-numeric className="shrink-0 text-ink">
                  {formatVnd(order.totalAmount)}
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

export { AwaitingOrderPicker }
