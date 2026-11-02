import type { RefObject } from "react"
import type { UseFormSetError } from "react-hook-form"
import { FormDialog } from "@/components/shared/form-dialog"
import { useToast } from "@/components/ui/toast"
import { formatNumber } from "@/lib/format"
import { useAdjustStock } from "../queries"
import { toAdjustInput, type AdjustFormValues } from "../schemas"
import type { InventoryItem } from "../types"
import { useStockMutationErrors } from "../use-stock-mutation-errors"
import { AdjustStockForm } from "./adjust-stock-form"

const FORM_FIELDS = ["newStock", "reason", "note"] as const

/** Hộp thoại Điều chỉnh kiểm kê. */
function AdjustStockDialog({
  open,
  item,
  onOpenChange,
  finalFocus,
}: {
  open: boolean
  item: InventoryItem | null
  onOpenChange: (open: boolean) => void
  finalFocus: RefObject<HTMLElement | null>
}) {
  const mutation = useAdjustStock()
  const toast = useToast()
  const errors = useStockMutationErrors<AdjustFormValues>(FORM_FIELDS, true)

  function handleOpenChange(next: boolean) {
    if (!next) errors.clearError()
    onOpenChange(next)
  }

  function submit(values: AdjustFormValues, setError: UseFormSetError<AdjustFormValues>) {
    if (!item || mutation.isPending) return
    errors.clearError()
    mutation.mutate(
      { variantId: item.id, input: toAdjustInput(values) },
      {
        onSuccess: ({ variant }) => {
          toast.add({
            title: "Đã điều chỉnh tồn kho",
            description: `${variant.sku}: tồn kho ${formatNumber(variant.stock)}`,
            data: { tone: "success" },
          })
          handleOpenChange(false)
        },
        onError: (error) => errors.handle(error, setError, () => handleOpenChange(false)),
      },
    )
  }

  return (
    <FormDialog
      open={open}
      onOpenChange={handleOpenChange}
      busy={mutation.isPending}
      title="Điều chỉnh tồn kho"
      description="Nhập số đếm thực tế sau kiểm kê, hệ thống tự tính chênh lệch."
      finalFocus={finalFocus}
    >
      {item ? (
        <AdjustStockForm
          item={item}
          busy={mutation.isPending}
          formError={errors.formError}
          onCancel={() => handleOpenChange(false)}
          onSubmit={submit}
        />
      ) : null}
    </FormDialog>
  )
}

export { AdjustStockDialog }
