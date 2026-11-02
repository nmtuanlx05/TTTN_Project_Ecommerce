import { useId } from "react"
import { zodResolver } from "@hookform/resolvers/zod"
import { useForm, useWatch, type UseFormSetError } from "react-hook-form"
import { FormDialogBody } from "@/components/shared/form-dialog"
import { Alert } from "@/components/ui/alert"
import { formatNumber } from "@/lib/format"
import { MAX_STOCK } from "../constants"
import { parseQuantityInput } from "../quantity-input"
import { importSchema, type ImportFormValues } from "../schemas"
import type { InventoryItem } from "../types"
import { IntegerField } from "./integer-field"
import { StockFormActions } from "./stock-form-actions"
import { StockNoteField } from "./stock-note-field"
import { StockPreview } from "./stock-preview"
import { StockVariantSummary } from "./stock-variant-summary"

/**
 * Form Nhập kho. Mutation nằm ở `ImportStockDialog`; form mount lại (reset sạch) mỗi lần mở hộp thoại.
 * `item` luôn là dòng mới nhất nên bản xem trước tính trên tồn hiện tại, không phải lúc mở.
 */
function ImportStockForm({
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
  onSubmit: (values: ImportFormValues, setError: UseFormSetError<ImportFormValues>) => void
}) {
  const id = useId()
  const {
    register,
    control,
    handleSubmit,
    setError,
    formState: { errors },
  } = useForm<ImportFormValues>({
    resolver: zodResolver(importSchema),
    defaultValues: { quantity: "", note: "" },
  })

  const quantity = parseQuantityInput(useWatch({ control, name: "quantity" }))
  const stockAfter = quantity === null ? null : item.stock + quantity
  const overflow = stockAfter !== null && stockAfter > MAX_STOCK

  return (
    <form
      noValidate
      onSubmit={handleSubmit((values) => onSubmit(values, setError))}
      className="flex min-h-0 flex-1 flex-col"
    >
      <FormDialogBody>
        {formError ? <Alert variant="danger">{formError}</Alert> : null}
        <StockVariantSummary item={item} />
        <IntegerField control={control} name="quantity" id={`${id}-quantity`} label="Số lượng nhập" />
        {stockAfter !== null ? (
          <StockPreview
            lines={[
              { label: "Tồn sau khi nhập", value: formatNumber(stockAfter) },
              { label: "Khả dụng sau khi nhập", value: formatNumber(stockAfter - item.reserved) },
            ]}
            warning={
              overflow
                ? `Tồn sau khi nhập vượt giới hạn cho phép (${formatNumber(MAX_STOCK)}). Giảm số lượng nhập.`
                : null
            }
          />
        ) : null}
        <StockNoteField id={`${id}-note`} register={register("note")} error={errors.note?.message} />
      </FormDialogBody>
      <StockFormActions submitLabel="Nhập kho" busy={busy} submitDisabled={overflow} onCancel={onCancel} />
    </form>
  )
}

export { ImportStockForm }
