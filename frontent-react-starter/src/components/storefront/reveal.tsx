import { useState, type ReactNode } from "react"
import { ABOVE_ONLY_MARGIN, useInView } from "@/hooks/use-in-view"
import { cn } from "@/lib/utils"

/**
 * Hiện dần (mờ + trồi nhẹ) khi cuộn tới, CHỈ MỘT LẦN: đã hiện thì giữ nguyên, tải lại dữ liệu bên trong không chạy lại.
 * Chỉ dùng cho khối nằm dưới màn hình đầu. Giảm chuyển động thì không hiệu ứng.
 *
 * Khối mặc định HIỆN (không có class ẩn): lúc gắn vào DOM đo một lần, nếu đã nằm trong màn hình thì giữ nguyên, không bao giờ
 * bị giấu hay chạy chuyển động (không nháy). Chỉ khối nằm dưới màn hình mới bị giấu, và việc giấu KHÔNG có transition (nên
 * không thấy mờ đi); chỉ khi cuộn tới mới thêm transition rồi hiện. Giấu ngay trong lúc commit nên không lộ ra một khung hình nào.
 *
 * Hai bộ quan sát: một báo khi khối đi VÀO màn hình, một (`ABOVE_ONLY_MARGIN`) báo khi khối đã nằm hẳn phía TRÊN, để cuộn nhảy
 * thẳng qua khối (Home/End, khôi phục vị trí) không để nó ẩn mãi.
 */
function Reveal({ children, className }: { children: ReactNode; className?: string }) {
  const { ref: enterRef, inView } = useInView<HTMLDivElement>({ once: true })
  const { ref: aboveRef, inView: notAbove } = useInView<HTMLDivElement>({
    rootMargin: ABOVE_ONLY_MARGIN,
    initialInView: true,
  })
  const [belowFold, setBelowFold] = useState(false)
  const [revealed, setRevealed] = useState(false)
  if (!revealed && (inView || !notAbove)) setRevealed(true)
  const hidden = belowFold && !revealed

  return (
    <div
      ref={(node) => {
        enterRef(node)
        aboveRef(node)
        if (node && node.getBoundingClientRect().top >= window.innerHeight) setBelowFold(true)
      }}
      className={cn(
        belowFold && revealed && "motion-safe:transition-[opacity,transform] motion-safe:duration-(--motion-slow) motion-safe:ease-smooth",
        hidden && "motion-safe:translate-y-4 motion-safe:opacity-0",
        className,
      )}
    >
      {children}
    </div>
  )
}

export { Reveal }
