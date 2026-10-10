import { useState } from "react"

/**
 * State của một hộp thoại gắn với một đối tượng (user đang sửa, user đang khóa…).
 *
 * `hide` chỉ đóng, vẫn giữ `target`: hộp thoại còn đang mờ dần nên nội dung không
 * được đổi giữa chừng. `show(null)` mở hộp thoại không có đối tượng (ví dụ form thêm mới).
 */
export function useDialogTarget<T>() {
  const [state, setState] = useState<{ open: boolean; target: T | null }>({
    open: false,
    target: null,
  })

  const show = (target: T | null) => setState({ open: true, target })
  const setOpen = (open: boolean) => setState((current) => ({ ...current, open }))

  return {
    target: state.target,
    open: state.open,
    show,
    hide: () => setOpen(false),
    /** Rải thẳng vào hộp thoại có props `open` và `onOpenChange`. */
    dialogProps: { open: state.open, onOpenChange: setOpen },
  }
}
