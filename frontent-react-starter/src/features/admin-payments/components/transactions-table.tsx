import { Link } from "react-router-dom"
import { Button } from "@/components/ui/button"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { formatDateTime, formatVnd } from "@/lib/format"
import { confirmTarget } from "../confirm-target"
import { REASON_HINT, TRANSACTION_HEADERS } from "../constants"
import type { PaymentTransaction } from "../types"
import { ReasonBadge } from "./reason-badge"

function ActionsCell({
  transaction,
  onConfirm,
  onResolve,
}: {
  transaction: PaymentTransaction
  onConfirm: (transaction: PaymentTransaction) => void
  onResolve: (transaction: PaymentTransaction) => void
}) {
  if (transaction.resolvedAt) {
    return (
      <div className="flex flex-col gap-0.5 text-caption text-ink-muted">
        <span>
          Đã xử lý{transaction.resolvedBy?.name ? ` bởi ${transaction.resolvedBy.name}` : ""} lúc {formatDateTime(transaction.resolvedAt)}
        </span>
        {transaction.resolutionNote ? <span className="text-ink">{transaction.resolutionNote}</span> : null}
      </div>
    )
  }
  return (
    <div className="flex flex-wrap gap-inline">
      {confirmTarget(transaction) ? (
        <Button size="sm" onClick={() => onConfirm(transaction)}>
          Xác nhận cho đơn
        </Button>
      ) : null}
      <Button size="sm" variant="secondary" onClick={() => onResolve(transaction)}>
        Đánh dấu đã xử lý
      </Button>
    </div>
  )
}

/** Bảng giao dịch cần xem lại. Nội dung chuyển khoản và lý do có chú thích việc cần làm; không hiện dữ liệu thô của ngân hàng (backend không trả). */
function TransactionsTable({
  transactions,
  onConfirm,
  onResolve,
}: {
  transactions: PaymentTransaction[]
  onConfirm: (transaction: PaymentTransaction) => void
  onResolve: (transaction: PaymentTransaction) => void
}) {
  return (
    <Table className="min-w-5xl">
      <TableHeader>
        <TableRow>
          {TRANSACTION_HEADERS.map((label) => (
            <TableHead key={label}>{label}</TableHead>
          ))}
        </TableRow>
      </TableHeader>
      <TableBody>
        {transactions.map((transaction) => (
          <TableRow key={transaction.id}>
            <TableCell className="whitespace-nowrap">{formatDateTime(transaction.createdAt)}</TableCell>
            <TableCell data-numeric className="font-medium whitespace-nowrap">
              {formatVnd(transaction.amount)}
            </TableCell>
            <TableCell data-numeric className="break-all">
              {transaction.content ?? "—"}
            </TableCell>
            <TableCell>
              <div className="flex max-w-xs flex-col items-start gap-1">
                <ReasonBadge reason={transaction.reviewReason} />
                {transaction.reviewReason ? (
                  <span className="text-caption text-ink-muted">{REASON_HINT[transaction.reviewReason]}</span>
                ) : null}
              </div>
            </TableCell>
            <TableCell>
              {transaction.order ? (
                <div className="flex flex-col gap-0.5">
                  <Link
                    to={`/admin/orders/${transaction.order.id}`}
                    data-numeric
                    className="font-medium text-ink underline underline-offset-4"
                  >
                    {transaction.order.code}
                  </Link>
                  <span data-numeric className="text-caption text-ink-muted">
                    Tổng đơn {formatVnd(transaction.order.totalAmount)}
                  </span>
                </div>
              ) : (
                <span className="text-body-sm text-ink-muted">Chưa gắn đơn</span>
              )}
            </TableCell>
            <TableCell>
              <ActionsCell transaction={transaction} onConfirm={onConfirm} onResolve={onResolve} />
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  )
}

export { TransactionsTable }
