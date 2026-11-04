import type { ReactNode } from "react"
import { cn } from "@/lib/utils"

/**
 * Danh sách cuộn ngang có điểm dừng (`snap`): mục có chiều rộng cố định do nơi dùng đặt trên từng `<li>`, nên luôn thấy một phần mục kế tiếp.
 * Vùng cuộn là `region` có nhãn và `tabIndex={0}` để người dùng bàn phím cuộn bằng mũi tên; vòng focus là vòng chung. Thanh cuộn mảnh theo token.
 * `busy`: đang tải lại dữ liệu (giữ danh sách cũ mờ đi).
 */
function HScrollList({ label, busy = false, children }: { label: string; busy?: boolean; children: ReactNode }) {
  return (
    <div
      role="region"
      aria-label={label}
      aria-busy={busy || undefined}
      tabIndex={0}
      className="scrollbar-thin snap-x snap-mandatory overflow-x-auto overscroll-x-contain pb-4 focus-visible:-outline-offset-2"
    >
      <ul
        className={cn(
          "flex w-max gap-4 md:gap-6 [&>li]:shrink-0 [&>li]:snap-start",
          busy && "opacity-60 transition-opacity duration-(--motion-base)",
        )}
      >
        {children}
      </ul>
    </div>
  )
}

export { HScrollList }
