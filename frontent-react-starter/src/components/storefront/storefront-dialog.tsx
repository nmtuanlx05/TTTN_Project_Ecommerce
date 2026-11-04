import type { ComponentProps, ReactNode } from "react"
import { Dialog } from "@base-ui/react/dialog"
import { X } from "lucide-react"
import { Button } from "@/components/ui/button"

/**
 * Hộp thoại nhỏ ở giữa màn hình của storefront (chọn phân loại, xác nhận xóa giỏ), dựng trên Base UI Dialog như `StorefrontDrawer` (cùng lớp phủ `canvas/70` + làm mờ nhẹ).
 * Portal nằm ngoài `<main>` nên tự gắn `soft-ui` lên panel (bo 10px, hover đảo màu) và bo `panel` 28px. Modal: khóa cuộn, giữ focus, Esc/bấm nền đóng.
 * Chuyển động (token `--motion-dialog-*` ở global.css): mờ vào kèm phóng nhẹ 0,96 → 1, đóng nhanh hơn; chỉ opacity/scale. Giảm chuyển động thì tức thì (global.css).
 * `onOpenChangeComplete`: gọi khi chuyển động mở/đóng xong (vd. đóng xong hộp thoại mới mở ngăn kéo để hai lớp nền không chồng nhau).
 * `finalFocus`: nơi nhận focus khi đóng (mặc định về phần tử đã mở; truyền hàm trả `false` khi một ngăn kéo vừa mở nên không được giành focus).
 */
function StorefrontDialog({
  open,
  onOpenChange,
  title,
  description,
  finalFocus,
  onOpenChangeComplete,
  children,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  title: string
  description?: ReactNode
  finalFocus?: ComponentProps<typeof Dialog.Popup>["finalFocus"]
  onOpenChangeComplete?: (open: boolean) => void
  children: ReactNode
}) {
  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange} onOpenChangeComplete={onOpenChangeComplete}>
      <Dialog.Portal>
        <Dialog.Backdrop className="fixed inset-0 z-50 bg-canvas/70 backdrop-blur-xs transition-opacity duration-(--motion-scrim) ease-smooth data-ending-style:opacity-0 data-starting-style:opacity-0" />
        <Dialog.Popup
          finalFocus={finalFocus}
          className="soft-ui fixed top-1/2 left-1/2 z-50 flex max-h-[calc(100dvh-2rem)] w-[min(28rem,calc(100vw-2rem))] -translate-x-1/2 -translate-y-1/2 flex-col rounded-panel border border-border-default bg-surface-raised text-ink outline-none transition-[opacity,scale] duration-(--motion-dialog-out) ease-drawer data-open:duration-(--motion-dialog-in) data-ending-style:scale-[0.96] data-ending-style:opacity-0 data-starting-style:scale-[0.96] data-starting-style:opacity-0"
        >
          <div className="flex items-start justify-between gap-3 px-gutter pt-5">
            <div className="flex min-w-0 flex-col gap-1">
              <Dialog.Title className="text-h3 font-semibold text-ink">{title}</Dialog.Title>
              {description ? (
                <Dialog.Description className="text-body-sm text-ink-muted">{description}</Dialog.Description>
              ) : null}
            </div>
            <Dialog.Close render={<Button variant="ghost" size="icon" aria-label="Đóng" className="press -mt-1 rounded-4xl bg-surface-sunken" />}>
              <X aria-hidden="true" />
            </Dialog.Close>
          </div>
          {children}
        </Dialog.Popup>
      </Dialog.Portal>
    </Dialog.Root>
  )
}

export { StorefrontDialog }
