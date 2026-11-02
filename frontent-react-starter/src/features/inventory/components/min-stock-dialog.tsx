import type { RefObject } from "react"
import type { UseFormSetError } from "react-hook-form"
import { FormDialog } from "@/components/shared/form-dialog"
import { useToast } from "@/components/ui/toast"
import { formatNumber } from "@/lib/format"
import { useUpdateMinStock } from "../queries"
import type { MinStockFormValues } from "../schemas"
import type { InventoryItem } from "../types"
import { useStockMutationErrors } from "../use-stock-mutation-errors"
import { MinStockForm } from "./min-stock-form"

const FORM_FIELDS = ["minStock"] as const

/** Hộp thoại Đặt ngưỡng cảnh báo. Không đổi tồn nên lỗi mạng chỉ là lỗi thường. */
function MinStockDialog({
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
  const mutation = useUpdateMinStock()
  const toast = useToast()
  const errors = useStockMutationErrors<MinStockFormValues>(FORM_FIELDS, false)

  function handleOpenChange(next: boolean) {
    if (!next) errors.clearError()
    onOpenChange(next)
  }

  function submit(values: MinStockFormValues, setError: UseFormSetError<MinStockFormValues>) {
    if (!item || mutation.isPending) return
    errors.clearError()
    mutation.mutate(
      { variantId: item.id, minStock: Number(values.minStock) },
      {
        onSuccess: (variant) => {
          toast.add({
            title: "Đã đặt ngưỡng cảnh báo",
            description: `${variant.sku}: ngưỡng ${formatNumber(variant.minStock)}`,
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
      title="Đặt ngưỡng cảnh báo"
      description="Đặt mức tồn khả dụng để biến thể này hiện trạng thái Sắp hết."
      finalFocus={finalFocus}
    >
      {item ? (
        <MinStockForm
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

export { MinStockDialog }
