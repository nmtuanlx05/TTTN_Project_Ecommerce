import type { RefObject } from "react"
import type { UseFormSetError } from "react-hook-form"
import { FormDialog } from "@/components/shared/form-dialog"
import { useToast } from "@/components/ui/toast"
import { formatNumber } from "@/lib/format"
import { useImportStock } from "../queries"
import { toImportInput, type ImportFormValues } from "../schemas"
import type { InventoryItem } from "../types"
import { useStockMutationErrors } from "../use-stock-mutation-errors"
import { ImportStockForm } from "./import-stock-form"

const FORM_FIELDS = ["quantity", "note"] as const

/** Hộp thoại Nhập kho. Mutation nằm ở đây vì hộp cần biết đang gọi API để khóa việc đóng. */
function ImportStockDialog({
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
  const mutation = useImportStock()
  const toast = useToast()
  const errors = useStockMutationErrors<ImportFormValues>(FORM_FIELDS, true)

  function handleOpenChange(next: boolean) {
    if (!next) errors.clearError()
    onOpenChange(next)
  }

  function submit(values: ImportFormValues, setError: UseFormSetError<ImportFormValues>) {
    if (!item || mutation.isPending) return
    errors.clearError()
    mutation.mutate(
      { variantId: item.id, input: toImportInput(values) },
      {
        onSuccess: ({ variant, movement }) => {
          toast.add({
            title: "Đã nhập kho",
            description: `${variant.sku}: +${formatNumber(movement.quantity)}, tồn kho ${formatNumber(variant.stock)}`,
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
      title="Nhập kho"
      description="Cộng thêm hàng vào tồn kho của biến thể này."
      finalFocus={finalFocus}
    >
      {item ? (
        <ImportStockForm
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

export { ImportStockDialog }
