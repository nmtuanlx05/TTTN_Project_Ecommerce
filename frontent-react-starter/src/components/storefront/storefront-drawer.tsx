import type { ComponentProps, ReactElement, ReactNode, RefObject } from "react"
import { Dialog } from "@base-ui/react/dialog"
import { X } from "lucide-react"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

const SIDE_CLASS = {
  left: "inset-y-0 left-0 w-5/6 max-w-sm border-r data-ending-style:-translate-x-full data-starting-style:-translate-x-full",
  right: "inset-y-0 right-0 w-5/6 max-w-sm border-l data-ending-style:translate-x-full data-starting-style:translate-x-full",
  top: "inset-x-0 top-0 max-h-dvh border-b data-ending-style:-translate-y-full data-starting-style:-translate-y-full",
} as const

/**
 * Chuyển động CHUNG của mọi ngăn kéo (menu, bộ lọc, giỏ hàng, khung tìm kiếm): chỉ `transform` (trượt từ mép) và opacity của lớp nền, token ở global.css (`--motion-drawer-*`, `--motion-scrim`).
 * Mở dùng `data-open:`, đóng (đã bỏ `data-open`) rơi về thời gian đóng ngắn hơn. Base UI giữ Popup trong DOM tới khi chuyển động đóng xong nên nội dung không mất giữa chừng.
 * Giảm chuyển động: `global.css` ép mọi transition về 0,01ms nên ngăn kéo hiện/ẩn tức thì, không trượt.
 */
const POPUP_MOTION =
  "transition-transform duration-(--motion-drawer-out) ease-drawer data-open:duration-(--motion-drawer-in)"
const BACKDROP_MOTION =
  "transition-opacity duration-(--motion-scrim) ease-smooth data-ending-style:opacity-0 data-starting-style:opacity-0"

/**
 * Chuyển cảnh giữa HAI ngăn kéo (vd. yêu thích → giỏ hàng), chỉ bật khi nơi ghép truyền `handoff`; không truyền thì mọi thứ y như cũ.
 * Mục tiêu: nền phía sau không chớp và hai lớp phủ không cộng dồn độ mờ.
 * - `out` (ngăn kéo thoát): lớp phủ biến mất NGAY (không mờ dần) vì lớp phủ của ngăn kéo vào hiện NGAY ở cùng độ mờ, nên độ sáng nền không đổi; bảng trượt ra ngắn (180ms)
 *   và nằm DƯỚI ngăn kéo vào nhưng TRÊN lớp phủ của nó (`z-52`), để bảng đang đi không bị phủ mờ đột ngột.
 * - `in` (ngăn kéo vào): lớp phủ hiện ngay (không mờ dần), bảng trượt vào 250ms (`ease-drawer`), nằm trên cùng (`z-53`).
 * Giảm chuyển động: `global.css` ép mọi transition về 0,01ms nên cả hai tức thì.
 */
type DrawerHandoff = "out" | "in"

const HANDOFF_BACKDROP: Record<DrawerHandoff, string> = {
  out: "data-ending-style:opacity-0",
  in: "",
}
const HANDOFF_POPUP: Record<DrawerHandoff, string> = {
  out: "z-52 transition-transform duration-[180ms] ease-drawer",
  in: "z-53 transition-transform duration-(--motion-drawer-out) ease-drawer data-open:duration-[250ms]",
}

type DrawerSide = keyof typeof SIDE_CLASS

/**
 * Ngăn kéo / khung trượt của storefront, dựng trên Base UI Dialog (như `ConfirmDialog`, `ImageLightbox`) vì
 * `ui/sheet.tsx` trái token: lớp phủ `bg-black`, đổ bóng, nút đóng 38px ghi tiếng Anh. Dialog modal nên khóa cuộn,
 * giữ focus bên trong, Esc và bấm nền đều đóng, và trả focus về nút đã mở (`trigger`).
 *
 * Nền đặc `surface-raised` + viền `border-default` để thấy rõ mép; lớp phủ là `canvas` mờ
 * nên không cần màu riêng. Base UI chỉ đặt `role="dialog"`, KHÔNG đặt `aria-modal` (đã đối chiếu mã nguồn), nên ngăn kéo tự thêm `aria-modal="true"`; tên đọc theo `Dialog.Title` (`aria-labelledby`). Có thể điều khiển từ ngoài (`open`).
 * `hideHeader`: bỏ thanh tiêu đề mặc định (khung tìm kiếm tự dựng); tiêu đề vẫn có cho trình đọc màn hình.
 */
function StorefrontDrawer({
  open,
  onOpenChange,
  side,
  title,
  trigger,
  triggerContent,
  hideHeader = false,
  titleInChildren = false,
  initialFocus,
  finalFocus,
  handoff,
  className,
  children,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  side: DrawerSide
  title: string
  /**
   * Nút mở (một `<Button>`); nội dung nút truyền qua `triggerContent`. Bỏ trống khi ngăn kéo được mở từ nơi khác (vd. ngăn kéo giỏ hàng):
   * khi đóng, focus trả về phần tử đang giữ focus lúc mở.
   */
  trigger?: ReactElement
  triggerContent?: ReactNode
  hideHeader?: boolean
  /** Phần `children` tự dựng tiêu đề bằng `Dialog.Title` (vd. tiêu đề kèm số lượng, nút đóng riêng): ngăn kéo không dựng thêm tiêu đề nào, `aria-labelledby` vẫn tự nối. Dùng cùng `hideHeader`. */
  titleInChildren?: boolean
  initialFocus?: RefObject<HTMLElement | null>
  /** Nơi nhận focus khi đóng (mặc định về phần tử đã mở). Chỉ truyền khi chuyển cảnh giữa hai ngăn kéo; `false` = không trả focus (ngăn kéo vừa mở đã nhận focus). */
  finalFocus?: ComponentProps<typeof Dialog.Popup>["finalFocus"]
  /** Chuyển cảnh giữa hai ngăn kéo, xem `DrawerHandoff`. */
  handoff?: DrawerHandoff
  className?: string
  children: ReactNode
}) {
  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      {trigger ? <Dialog.Trigger render={trigger}>{triggerContent}</Dialog.Trigger> : null}
      <Dialog.Portal>
        <Dialog.Backdrop
          className={cn("fixed inset-0 z-50 bg-canvas/70 backdrop-blur-xs", handoff ? HANDOFF_BACKDROP[handoff] : BACKDROP_MOTION)}
        />
        <Dialog.Popup
          aria-modal="true"
          initialFocus={initialFocus}
          finalFocus={finalFocus}
          className={cn(
            "fixed z-50 flex flex-col border-border-default bg-surface-raised text-ink outline-none",
            handoff ? HANDOFF_POPUP[handoff] : POPUP_MOTION,
            SIDE_CLASS[side],
            className,
          )}
        >
          {titleInChildren ? null : hideHeader ? (
            <Dialog.Title className="sr-only">{title}</Dialog.Title>
          ) : (
            <div className="flex items-center justify-between border-b border-border-subtle py-2 pr-2 pl-gutter">
              <Dialog.Title className="font-display text-h3 text-ink">{title}</Dialog.Title>
              <Dialog.Close render={<Button variant="ghost" size="icon" aria-label="Đóng" />}>
                <X />
              </Dialog.Close>
            </div>
          )}
          {children}
        </Dialog.Popup>
      </Dialog.Portal>
    </Dialog.Root>
  )
}

export { StorefrontDrawer }
export type { DrawerHandoff }
