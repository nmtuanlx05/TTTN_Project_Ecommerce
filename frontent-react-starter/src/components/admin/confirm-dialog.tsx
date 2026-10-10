import type { ReactNode } from "react"
import { Dialog } from "@base-ui/react/dialog"
import { Button } from "@/components/ui/button"

/**
 * Hộp xác nhận cho hành động nặng tay (khóa tài khoản, hủy đơn…).
 *
 * Dựng thẳng trên Base UI thay vì `ui/dialog.tsx`: bản shadcn đó dùng chữ
 * "Close" tiếng Anh, `rounded-xl`, `bg-black/10` và cỡ chữ mặc định của
 * Tailwind, đều trái token của hệ thống. Không sửa ui/ vì thư mục đó có thể
 * bị `shadcn add` ghi đè.
 */
function ConfirmDialog({
  open,
  onOpenChange,
  title,
  description,
  confirmLabel,
  cancelLabel = "Hủy bỏ",
  destructive = false,
  loading = false,
  onConfirm,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  title: string
  description: ReactNode
  confirmLabel: string
  cancelLabel?: string
  destructive?: boolean
  loading?: boolean
  onConfirm: () => void
}) {
  return (
    <Dialog.Root
      open={open}
      // Đang gọi API thì không cho đóng, để không mất kết quả của thao tác.
      onOpenChange={(next) => (loading ? undefined : onOpenChange(next))}
    >
      <Dialog.Portal>
        <Dialog.Backdrop className="fixed inset-0 z-50 bg-surface-sunken/70 backdrop-blur-xs duration-100 data-open:animate-in data-open:fade-in-0 data-closed:animate-out data-closed:fade-out-0" />
        <Dialog.Popup className="fixed top-1/2 left-1/2 z-50 flex w-[min(28rem,calc(100vw-2rem))] -translate-x-1/2 -translate-y-1/2 flex-col gap-stack rounded-md border border-border-default bg-surface-raised p-card outline-none duration-100 data-open:animate-in data-open:fade-in-0 data-open:zoom-in-95 data-closed:animate-out data-closed:fade-out-0 data-closed:zoom-out-95">
          <div className="flex flex-col gap-1.5">
            <Dialog.Title className="font-display text-h3 text-ink">{title}</Dialog.Title>
            <Dialog.Description className="text-body-sm text-ink-muted">
              {description}
            </Dialog.Description>
          </div>
          <div className="flex flex-col-reverse gap-inline sm:flex-row sm:justify-end">
            <Button variant="secondary" disabled={loading} onClick={() => onOpenChange(false)}>
              {cancelLabel}
            </Button>
            <Button
              variant={destructive ? "destructive" : "primary"}
              loading={loading}
              onClick={onConfirm}
            >
              {confirmLabel}
            </Button>
          </div>
        </Dialog.Popup>
      </Dialog.Portal>
    </Dialog.Root>
  )
}

export { ConfirmDialog }
