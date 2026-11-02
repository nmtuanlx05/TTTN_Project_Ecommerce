import { useId } from "react"
import { zodResolver } from "@hookform/resolvers/zod"
import { Controller, useForm, useWatch, type UseFormSetError } from "react-hook-form"
import { FormDialogBody } from "@/components/shared/form-dialog"
import { Alert } from "@/components/ui/alert"
import { Field } from "@/components/ui/field"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { formatNumber } from "@/lib/format"
import { EXPORT_REASON_LABEL, EXPORT_REASONS } from "../constants"
import { parseQuantityInput } from "../quantity-input"
import { exportSchema, isExportReason, type ExportFormValues } from "../schemas"
import type { InventoryItem } from "../types"
import { IntegerField } from "./integer-field"
import { StockFormActions } from "./stock-form-actions"
import { StockNoteField } from "./stock-note-field"
import { StockPreview } from "./stock-preview"
import { StockVariantSummary } from "./stock-variant-summary"

const REASON_ITEMS = EXPORT_REASONS.map((reason) => ({ value: reason, label: EXPORT_REASON_LABEL[reason] }))

/**
 * Form Xuất kho / hao hụt. Lý do là mã theo API (Hư hỏng, Thất lạc/mất, Khác); chọn "Khác" thì ghi chú bắt buộc.
 * Vượt tồn khả dụng chỉ cảnh báo, server mới là nơi quyết định (409 hiện nguyên văn ở đầu form).
 */
function ExportStockForm({
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
  onSubmit: (values: ExportFormValues, setError: UseFormSetError<ExportFormValues>) => void
}) {
  const id = useId()
  const {
    register,
    control,
    handleSubmit,
    setError,
    formState: { errors },
  } = useForm<ExportFormValues>({
    resolver: zodResolver(exportSchema),
    defaultValues: { quantity: "", reason: "", note: "" },
  })

  const quantity = parseQuantityInput(useWatch({ control, name: "quantity" }))
  const reason = useWatch({ control, name: "reason" })

  return (
    <form
      noValidate
      onSubmit={handleSubmit((values) => onSubmit(values, setError))}
      className="flex min-h-0 flex-1 flex-col"
    >
      <FormDialogBody>
        {formError ? <Alert variant="danger">{formError}</Alert> : null}
        <StockVariantSummary item={item} />
        <IntegerField control={control} name="quantity" id={`${id}-quantity`} label="Số lượng xuất" />
        {quantity !== null ? (
          <StockPreview
            lines={[
              { label: "Tồn kho sau khi xuất", value: formatNumber(item.stock - quantity) },
              { label: "Khả dụng sau khi xuất", value: formatNumber(item.available - quantity) },
            ]}
            warning={
              quantity > item.available
                ? `Số lượng xuất vượt tồn khả dụng (${formatNumber(item.available)}). Máy chủ sẽ từ chối nếu vẫn vượt khi bạn gửi.`
                : null
            }
          />
        ) : null}
        <Controller
          control={control}
          name="reason"
          render={({ field, fieldState }) => (
            <Field label="Lý do" htmlFor={`${id}-reason`} required error={fieldState.error?.message}>
              <Select
                items={REASON_ITEMS}
                value={isExportReason(field.value) ? field.value : null}
                onValueChange={(next) => field.onChange(next ?? "")}
              >
                <SelectTrigger id={`${id}-reason`} onBlur={field.onBlur} ref={field.ref}>
                  <SelectValue placeholder="Chọn lý do xuất kho" />
                </SelectTrigger>
                <SelectContent>
                  {REASON_ITEMS.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>
          )}
        />
        <StockNoteField
          id={`${id}-note`}
          register={register("note")}
          error={errors.note?.message}
          required={reason === "OTHER"}
        />
      </FormDialogBody>
      <StockFormActions submitLabel="Xuất kho" busy={busy} onCancel={onCancel} />
    </form>
  )
}

export { ExportStockForm }
