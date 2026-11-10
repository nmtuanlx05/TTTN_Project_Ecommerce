import { useId, useState } from "react"
import { zodResolver } from "@hookform/resolvers/zod"
import { useForm, useWatch } from "react-hook-form"
import { FormDialogBody, FormDialogFooter } from "@/components/shared/form-dialog"
import { Alert } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import { Field } from "@/components/ui/field"
import { Textarea } from "@/components/ui/textarea"
import { formatVnd } from "@/lib/format"
import { NOTE_MAX_LENGTH } from "../constants"
import { paymentNoteSchema, type PaymentNoteValues } from "../schemas"
import type { ConfirmOrderTarget, PaymentTransaction } from "../types"
import { AwaitingOrderPicker } from "./awaiting-order-picker"

/**
 * Form xác nhận đã nhận tiền. `order` có sẵn (xác nhận từ trang đơn hoặc giao dịch thiếu tiền đã gắn đơn) hoặc `null` (giao dịch không khớp: phải tìm và chọn đơn).
 * Hiện rõ số tiền giao dịch gốc (nếu có) và TỔNG ĐƠN sẽ được ghi nhận, vì backend ghi nhận bằng tổng đơn dù giao dịch gốc nhỏ hơn.
 */
function ConfirmPaymentForm({
  order,
  transaction,
  busy,
  formError,
  onCancel,
  onSubmit,
}: {
  order: ConfirmOrderTarget | null
  transaction: PaymentTransaction | null
  busy: boolean
  formError: string | null
  onCancel: () => void
  onSubmit: (order: ConfirmOrderTarget, note: string) => void
}) {
  const id = useId()
  const [picked, setPicked] = useState<ConfirmOrderTarget | null>(null)
  const target = order ?? picked
  const {
    register,
    control,
    handleSubmit,
    formState: { errors },
  } = useForm<PaymentNoteValues>({ resolver: zodResolver(paymentNoteSchema), defaultValues: { note: "" } })
  const length = useWatch({ control, name: "note" }).length
  const shortfall = target && transaction && transaction.amount !== target.totalAmount

  return (
    <form
      noValidate
      onSubmit={handleSubmit((values) => target && onSubmit(target, values.note))}
      className="flex min-h-0 flex-1 flex-col"
    >
      <FormDialogBody>
        {formError ? <Alert variant="danger">{formError}</Alert> : null}
        {order === null ? <AwaitingOrderPicker picked={picked} onPick={setPicked} /> : null}
        <dl className="flex flex-col gap-2 rounded-md bg-surface-sunken p-card text-body-sm">
          {transaction ? (
            <div className="flex justify-between gap-4">
              <dt className="text-ink-muted">Giao dịch gốc</dt>
              <dd data-numeric className="font-medium text-ink">
                {formatVnd(transaction.amount)}
              </dd>
            </div>
          ) : null}
          <div className="flex justify-between gap-4">
            <dt className="text-ink-muted">Đơn hàng</dt>
            <dd data-numeric className="font-medium text-ink">
              {target?.code ?? "Chưa chọn"}
            </dd>
          </div>
          <div className="flex justify-between gap-4">
            <dt className="text-ink-muted">Số tiền sẽ ghi nhận (tổng đơn)</dt>
            <dd data-numeric className="font-semibold text-ink">
              {target ? formatVnd(target.totalAmount) : "—"}
            </dd>
          </div>
        </dl>
        <Alert variant="warning">
          {shortfall
            ? `Giao dịch gốc là ${formatVnd(transaction.amount)} nhưng hệ thống sẽ ghi nhận đã nhận đủ ${formatVnd(target.totalAmount)}. Chỉ xác nhận khi bạn đã thấy đủ tiền trong tài khoản (ví dụ khách đã chuyển bù).`
            : "Chỉ xác nhận khi bạn đã thấy tiền vào tài khoản. Đơn sẽ chuyển sang \"Chờ xác nhận\" và được ghi là đã thanh toán đủ."}
        </Alert>
        <Field
          label="Ghi chú đối soát"
          htmlFor={`${id}-note`}
          required
          error={errors.note?.message}
          description={`Ví dụ mã giao dịch ngân hàng. Được ghi vào lịch sử đơn kèm tên bạn. ${length}/${NOTE_MAX_LENGTH} ký tự.`}
        >
          <Textarea rows={3} {...register("note")} />
        </Field>
      </FormDialogBody>
      <FormDialogFooter>
        <Button type="button" variant="secondary" disabled={busy} onClick={onCancel}>
          Hủy bỏ
        </Button>
        <Button type="submit" loading={busy} disabled={!target}>
          Xác nhận đã nhận tiền
        </Button>
      </FormDialogFooter>
    </form>
  )
}

export { ConfirmPaymentForm }
