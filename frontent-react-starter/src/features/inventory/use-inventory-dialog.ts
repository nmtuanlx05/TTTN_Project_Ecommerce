import { useRef, useState, type RefObject } from "react"
import type { InventoryItem } from "./types"

export type InventoryDialogKind = "import" | "adjust" | "export" | "minStock" | "history"

/**
 * Hộp thoại kho đang mở (nếu có). Một state duy nhất cho cả bảng: hộp thoại dựng một lần ngoài bảng và
 * ngoài `DropdownMenuContent`, nên bấm mục menu (đóng menu ngay) không hủy hộp thoại.
 *
 * - `hide` chỉ đóng, vẫn giữ `kind` và `item`: hộp thoại còn đang mờ dần nên nội dung không được đổi giữa chừng.
 * - `item` là bản chụp lúc mở; hộp thoại ưu tiên dòng mới nhất trong danh sách (xem `InventoryDialogs`).
 * - `returnFocusRef` trỏ tới nút đã mở hộp thoại (Nhập kho, Điều chỉnh hoặc "⋯"): mục menu đã bị gỡ khỏi DOM
 *   nên không thể để thư viện tự đoán, nếu không focus rơi về `body`.
 */
export function useInventoryDialog() {
  const [state, setState] = useState<{
    open: boolean
    kind: InventoryDialogKind | null
    item: InventoryItem | null
  }>({ open: false, kind: null, item: null })
  const returnFocusRef: RefObject<HTMLElement | null> = useRef(null)

  return {
    open: state.open,
    kind: state.kind,
    item: state.item,
    returnFocusRef,
    show: (kind: InventoryDialogKind, item: InventoryItem, trigger: HTMLElement | null) => {
      returnFocusRef.current = trigger
      setState({ open: true, kind, item })
    },
    hide: () => setState((current) => ({ ...current, open: false })),
  }
}

export type InventoryDialogState = ReturnType<typeof useInventoryDialog>
