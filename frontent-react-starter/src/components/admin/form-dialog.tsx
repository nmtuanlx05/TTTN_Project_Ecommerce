import type { ReactNode } from "react"
import { Dialog } from "@base-ui/react/dialog"
import { cn } from "@/lib/utils"

/**
 * Vỏ hộp thoại cho form (thêm/sửa). Cùng kiểu với `ConfirmDialog`: dựng thẳng trên
 * Base UI, dùng token của hệ thống thay vì `ui/dialog.tsx` của shadcn.
 *
 * - Bấm ra ngoài không đóng, để không mất dữ liệu đang nhập. Esc và nút Hủy bỏ vẫn đóng.
 * - `busy` (đang gọi API) thì không đóng được, để không mất kết quả của thao tác.
 * - Nội dung (`children`) nằm trong Popup nên chỉ mount khi mở: state của form
 *   tự reset mỗi lần mở lại.
 * - `children` là một `<form>` gồm `FormDialogBody` + `FormDialogFooter`.
 */
function FormDialog({
  open,
  onOpenChange,
  busy = false,
  title,
  description,
  children,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  busy?: boolean
  title: string
  description: string
  children: ReactNode
}) {
  return (
    <Dialog.Root
      open={open}
      disablePointerDismissal
      onOpenChange={(next) => (busy ? undefined : onOpenChange(next))}
    >
      <Dialog.Portal>
        <Dialog.Backdrop className="fixed inset-0 z-50 bg-surface-sunken/70 backdrop-blur-xs duration-100 data-open:animate-in data-open:fade-in-0 data-closed:animate-out data-closed:fade-out-0" />
        <Dialog.Popup className="fixed top-1/2 left-1/2 z-50 flex max-h-[calc(100dvh-2rem)] w-[min(30rem,calc(100vw-2rem))] -translate-x-1/2 -translate-y-1/2 flex-col rounded-md border border-border-default bg-surface-raised outline-none duration-100 data-open:animate-in data-open:fade-in-0 data-open:zoom-in-95 data-closed:animate-out data-closed:fade-out-0 data-closed:zoom-out-95">
          <div className="flex flex-col gap-1.5 border-b border-border-subtle p-card">
            <Dialog.Title className="font-display text-h3 text-ink">{title}</Dialog.Title>
            <Dialog.Description className="text-body-sm text-ink-muted">
              {description}
            </Dialog.Description>
          </div>
          {children}
        </Dialog.Popup>
      </Dialog.Portal>
    </Dialog.Root>
  )
}

/** Vùng chứa các ô nhập; cuộn riêng khi màn hình thấp để footer luôn thấy. */
function FormDialogBody({ className, children }: { className?: string; children: ReactNode }) {
  return (
    <div className={cn("flex min-h-0 flex-1 flex-col gap-stack overflow-y-auto p-card", className)}>
      {children}
    </div>
  )
}

function FormDialogFooter({ children }: { children: ReactNode }) {
  return (
    <div className="flex flex-col-reverse gap-inline border-t border-border-subtle p-card sm:flex-row sm:justify-end">
      {children}
    </div>
  )
}

export { FormDialog, FormDialogBody, FormDialogFooter }
