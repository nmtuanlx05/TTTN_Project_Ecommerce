import type { RefObject } from "react"
import { FormDialog, FormDialogBody, FormDialogFooter } from "@/components/shared/form-dialog"
import { Button } from "@/components/ui/button"
import type { InventoryItem } from "../types"
import { MovementsList } from "./movements-list"
import { StockVariantSummary } from "./stock-variant-summary"

/** Hộp thoại Xem lịch sử: chỉ đọc nên không có form, chỉ nút Đóng. */
function MovementsDialog({
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
  return (
    <FormDialog
      open={open}
      onOpenChange={onOpenChange}
      title="Lịch sử đổi tồn"
      description="Mỗi lần nhập, xuất hoặc điều chỉnh được ghi lại, mới nhất ở trên."
      finalFocus={finalFocus}
    >
      {item ? (
        <>
          <FormDialogBody>
            <StockVariantSummary item={item} />
            <MovementsList variantId={item.id} />
          </FormDialogBody>
          <FormDialogFooter>
            <Button variant="secondary" onClick={() => onOpenChange(false)}>
              Đóng
            </Button>
          </FormDialogFooter>
        </>
      ) : null}
    </FormDialog>
  )
}

export { MovementsDialog }
