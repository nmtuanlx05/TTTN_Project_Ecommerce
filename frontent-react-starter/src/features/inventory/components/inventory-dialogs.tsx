import type { InventoryDialogKind, InventoryDialogState } from "../use-inventory-dialog"
import type { InventoryItem } from "../types"
import { AdjustStockDialog } from "./adjust-stock-dialog"
import { ExportStockDialog } from "./export-stock-dialog"
import { ImportStockDialog } from "./import-stock-dialog"
import { MinStockDialog } from "./min-stock-dialog"
import { MovementsDialog } from "./movements-dialog"

/**
 * Dựng các hộp thoại kho một lần, ngoài bảng và ngoài menu "⋯", điều khiển bằng state. `item` ưu tiên dòng
 * mới nhất trong danh sách hiện tại (khớp theo id) để mọi con số trong hộp luôn mới; dòng không còn trên trang
 * (đổi lọc, hoặc vừa bị làm mới ra ngoài) thì dùng bản chụp lúc mở.
 */
function InventoryDialogs({ dialog, items }: { dialog: InventoryDialogState; items: InventoryItem[] }) {
  const snapshot = dialog.item
  const item = snapshot ? (items.find((candidate) => candidate.id === snapshot.id) ?? snapshot) : null

  function propsFor(kind: InventoryDialogKind) {
    return {
      open: dialog.open && dialog.kind === kind,
      item,
      onOpenChange: (next: boolean) => {
        if (!next) dialog.hide()
      },
      finalFocus: dialog.returnFocusRef,
    }
  }

  return (
    <>
      <ImportStockDialog {...propsFor("import")} />
      <AdjustStockDialog {...propsFor("adjust")} />
      <ExportStockDialog {...propsFor("export")} />
      <MinStockDialog {...propsFor("minStock")} />
      <MovementsDialog {...propsFor("history")} />
    </>
  )
}

export { InventoryDialogs }
