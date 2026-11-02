import type { RefObject } from "react"
import type { UseFormSetError } from "react-hook-form"
import { FormDialog } from "@/components/shared/form-dialog"
import { useToast } from "@/components/ui/toast"
import { formatNumber } from "@/lib/format"
import { useExportStock } from "../queries"
import { toExportInput, type ExportFormValues } from "../schemas"
import type { InventoryItem } from "../types"
import { useStockMutationErrors } from "../use-stock-mutation-errors"
import { ExportStockForm } from "./export-stock-form"

const FORM_FIELDS = ["quantity", "reason", "note"] as const

/** Hộp thoại Xuất kho / hao hụt. */
function ExportStockDialog({
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
  const mutation = useExportStock()
  const toast = useToast()
  const errors = useStockMutationErrors<ExportFormValues>(FORM_FIELDS, true)

  function handleOpenChange(next: boolean) {
    if (!next) errors.clearError()
    onOpenChange(next)
  }

  function submit(values: ExportFormValues, setError: UseFormSetError<ExportFormValues>) {
    if (!item || mutation.isPending) return
    const input = toExportInput(values)
    if (!input) return
    errors.clearError()
    mutation.mutate(
      { variantId: item.id, input },
      {
        onSuccess: ({ variant, movement }) => {
          toast.add({
            title: "Đã xuất kho",
            description: `${variant.sku}: −${formatNumber(Math.abs(movement.quantity))}, tồn kho ${formatNumber(variant.stock)}`,
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
      title="Xuất kho / hao hụt"
      description="Trừ hàng hư hỏng, thất lạc hoặc xuất vì lý do khác khỏi tồn kho."
      finalFocus={finalFocus}
    >
      {item ? (
        <ExportStockForm
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

export { ExportStockDialog }
