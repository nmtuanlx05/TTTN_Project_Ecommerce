import { useId } from "react"
import { zodResolver } from "@hookform/resolvers/zod"
import { useForm, type UseFormSetError } from "react-hook-form"
import { FormDialogBody, FormDialogFooter } from "@/components/shared/form-dialog"
import { Alert } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import { todayVn } from "@/lib/format"
import { toFormValues } from "../form-mapping"
import { makeVoucherSchema, type VoucherFormValues } from "../schemas"
import type { VoucherDetail } from "../types"
import { VoucherBasicFields } from "./voucher-basic-fields"
import { VoucherDateFields } from "./voucher-date-fields"
import { VoucherDiscountFields } from "./voucher-discount-fields"
import { VoucherExample } from "./voucher-example"
import { VoucherLimitFields } from "./voucher-limit-fields"
import { VoucherStatsBlock } from "./voucher-stats"

/**
 * Form tạo (`detail === null`) và sửa voucher. Mount lại (reset sạch) mỗi lần mở hộp thoại; khi sửa chỉ mount sau khi
 * `GET /:id` xong để `usedCount` luôn mới. Mutation nằm ở `useVoucherSave`, form chỉ kiểm dữ liệu và gọi `onSubmit`.
 */
function VoucherForm({
  detail,
  busy,
  onCancel,
  onSubmit,
}: {
  detail: VoucherDetail | null
  busy: boolean
  onCancel: () => void
  onSubmit: (
    values: VoucherFormValues,
    setError: UseFormSetError<VoucherFormValues>,
    locked: boolean,
  ) => void
}) {
  const id = useId()
  const mode = detail ? "edit" : "create"
  const usedCount = detail?.usedCount ?? 0
  const locked = usedCount > 0

  const form = useForm<VoucherFormValues>({
    resolver: zodResolver(makeVoucherSchema({ mode, locked, usedCount, today: todayVn() })),
    defaultValues: toFormValues(detail),
  })
  const { handleSubmit, setError, control, formState } = form

  return (
    <form
      noValidate
      onSubmit={handleSubmit((values) => onSubmit(values, setError, locked))}
      className="flex min-h-0 flex-1 flex-col"
    >
      <FormDialogBody>
        {detail ? <VoucherStatsBlock stats={detail.stats} /> : null}
        {locked ? (
          <Alert variant="info">
            Voucher đã được dùng {usedCount} lần nên mã, loại giảm, giá trị, mức giảm tối đa và ngày bắt đầu bị khóa.
            Muốn đổi các mục đó, hãy tắt voucher này và tạo voucher mới.
          </Alert>
        ) : null}
        <VoucherBasicFields form={form} id={id} usedCount={usedCount} />
        <VoucherDiscountFields form={form} id={id} usedCount={usedCount} />
        <VoucherLimitFields form={form} id={id} usedCount={usedCount} />
        <VoucherDateFields form={form} id={id} usedCount={usedCount} />
        <VoucherExample control={control} />
      </FormDialogBody>

      <FormDialogFooter>
        <Button className="cursor-pointer" type="button" variant="secondary" disabled={busy} onClick={onCancel}>
          Hủy bỏ
        </Button>
        <Button
          className="cursor-pointer"
          type="submit"
          loading={busy}
          disabled={mode === "edit" && !formState.isDirty}
        >
          {mode === "create" ? "Tạo voucher" : "Lưu thay đổi"}
        </Button>
      </FormDialogFooter>
    </form>
  )
}

export { VoucherForm }
