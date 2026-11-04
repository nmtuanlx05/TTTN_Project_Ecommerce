import { useId } from "react"
import { zodResolver } from "@hookform/resolvers/zod"
import { useForm, useWatch, type UseFormSetError } from "react-hook-form"
import { FormDialogBody } from "@/components/shared/form-dialog"
import { Alert } from "@/components/ui/alert"
import { parseQuantityInput } from "../quantity-input"
import { minStockSchema, type MinStockFormValues } from "../schemas"
import type { InventoryItem, StockStatus } from "../types"
import { IntegerField } from "./integer-field"
import { StockFormActions } from "./stock-form-actions"
import { StockPreview } from "./stock-preview"
import { StockStatusBadge } from "./stock-status-badge"
import { StockVariantSummary } from "./stock-variant-summary"

/**
 * Trạng thái tồn theo cùng công thức backend (docs/api/inventory.md). Chỉ dùng để xem trước phía
 * client (vd. ngưỡng mới); số liệu thật luôn lấy từ `stockStatus` server trả về.
 */
function stockStatusOf(available: number, minStock: number): StockStatus {
  if (available <= 0) return "out"
  if (available <= minStock) return "low"
  return "in_stock"
}

/** Form Đặt ngưỡng cảnh báo. Xem trước trạng thái tồn với ngưỡng mới (công thức giống backend). */
function MinStockForm({
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
  onSubmit: (values: MinStockFormValues, setError: UseFormSetError<MinStockFormValues>) => void
}) {
  const id = useId()
  const { control, handleSubmit, setError } = useForm<MinStockFormValues>({
    resolver: zodResolver(minStockSchema),
    defaultValues: { minStock: String(item.minStock) },
  })

  const minStock = parseQuantityInput(useWatch({ control, name: "minStock" }))

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
          name="minStock"
          id={`${id}-min-stock`}
          label="Ngưỡng cảnh báo"
          description='Khả dụng bằng hoặc thấp hơn ngưỡng (và còn hàng) thì hiện "Sắp hết". Ngưỡng 0 = không cảnh báo.'
        />
        {minStock !== null ? (
          <StockPreview
            lines={[
              { label: "Trạng thái hiện tại", value: <StockStatusBadge status={item.stockStatus} /> },
              {
                label: "Trạng thái với ngưỡng mới",
                value: <StockStatusBadge status={stockStatusOf(item.available, minStock)} />,
              },
            ]}
          />
        ) : null}
      </FormDialogBody>
      <StockFormActions submitLabel="Lưu ngưỡng" busy={busy} onCancel={onCancel} />
    </form>
  )
}

export { MinStockForm }
