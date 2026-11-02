import { useId } from "react"
import { zodResolver } from "@hookform/resolvers/zod"
import { useForm, useWatch, type UseFormSetError } from "react-hook-form"
import { FormDialogBody } from "@/components/shared/form-dialog"
import { Alert } from "@/components/ui/alert"
import { Field } from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { formatNumber } from "@/lib/format"
import { REASON_MAX_LENGTH } from "../constants"
import { parseQuantityInput } from "../quantity-input"
import { adjustSchema, type AdjustFormValues } from "../schemas"
import type { InventoryItem } from "../types"
import { IntegerField } from "./integer-field"
import { StockFormActions } from "./stock-form-actions"
import { StockNoteField } from "./stock-note-field"
import { StockPreview } from "./stock-preview"
import { StockVariantSummary } from "./stock-variant-summary"

/** "+6", "−3" (dấu trừ thật), "0". */
function formatSigned(value: number): string {
  if (value === 0) return "0"
  return `${value > 0 ? "+" : "−"}${formatNumber(Math.abs(value))}`
}

/**
 * Form Điều chỉnh theo số đếm thực tế (không phải độ chênh). Ô đếm điền sẵn tồn hiện tại nên nút gửi chỉ
 * mở khi chênh lệch khác 0 (backend từ chối 400 và không ghi movement). Thấp hơn số đang giữ chỉ cảnh báo:
 * server mới là nơi quyết định.
 */
function AdjustStockForm({
  item,
  busy,
  formError,
  onCancel,
  onSubmit,
}: {
  item: InventoryItem
  busy: boolean
  formError: string | null
  onCancel: () => void
  onSubmit: (values: AdjustFormValues, setError: UseFormSetError<AdjustFormValues>) => void
}) {
  const id = useId()
  const {
    register,
    control,
    handleSubmit,
    setError,
    formState: { errors },
  } = useForm<AdjustFormValues>({
    resolver: zodResolver(adjustSchema),
    defaultValues: { newStock: String(item.stock), reason: "", note: "" },
  })

  const counted = parseQuantityInput(useWatch({ control, name: "newStock" }))
  const difference = counted === null ? null : counted - item.stock
  const belowReserved = counted !== null && counted < item.reserved

  return (
    <form
      noValidate
      onSubmit={handleSubmit((values) => onSubmit(values, setError))}
      className="flex min-h-0 flex-1 flex-col"
    >
      <FormDialogBody>
        {formError ? <Alert variant="danger">{formError}</Alert> : null}
        <StockVariantSummary item={item} />
        <IntegerField
          control={control}
          name="newStock"
          id={`${id}-new-stock`}
          label="Số lượng đếm thực tế"
          description="Số đếm thực tế trong kho, không phải số chênh lệch."
        />
        {difference !== null ? (
          <StockPreview
            lines={[
              { label: "Tồn kho hiện tại", value: formatNumber(item.stock) },
              { label: "Chênh lệch", value: formatSigned(difference) },
            ]}
            warning={
              belowReserved
                ? `Số đếm thấp hơn số đang giữ cho đơn hàng (${formatNumber(item.reserved)}). Máy chủ sẽ từ chối nếu vẫn thấp hơn khi bạn gửi.`
                : difference === 0
                  ? "Số đếm đang bằng tồn hiện tại, chưa có gì để điều chỉnh. Nhập số đếm khác."
                  : null
            }
          />
        ) : null}
        <Field
          label="Lý do"
          htmlFor={`${id}-reason`}
          required
          error={errors.reason?.message}
          description={`Ví dụ Kiểm kê cuối tháng. Tối đa ${REASON_MAX_LENGTH} ký tự.`}
        >
          <Input autoComplete="off" {...register("reason")} />
        </Field>
        <StockNoteField id={`${id}-note`} register={register("note")} error={errors.note?.message} />
      </FormDialogBody>
      <StockFormActions
        submitLabel="Lưu điều chỉnh"
        busy={busy}
        submitDisabled={difference === 0}
        onCancel={onCancel}
      />
    </form>
  )
}

export { AdjustStockForm }
