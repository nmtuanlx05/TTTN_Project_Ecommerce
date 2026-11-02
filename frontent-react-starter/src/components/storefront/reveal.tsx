import { useState, type ReactNode } from "react"
import { useInView } from "@/hooks/use-in-view"
import { cn } from "@/lib/utils"

/**
 * Hiện dần (mờ + trồi nhẹ) khi cuộn tới, CHỈ MỘT LẦN: đã hiện thì giữ nguyên, tải lại dữ liệu bên trong không chạy lại.
 * Khối đã nằm trong màn hình ngay lúc dựng (màn hình đầu) thì hiện luôn, không hiệu ứng. Giảm chuyển động thì không hiệu ứng.
 * Chỉ dùng cho khối nằm dưới màn hình đầu.
 */
function Reveal({ children, className }: { children: ReactNode; className?: string }) {
  const { ref, inView } = useInView<HTMLDivElement>({ once: true })
  // Đo một lần lúc gắn vào DOM (trước khi vẽ): đã ở trong màn hình thì bỏ qua hiệu ứng.
  const [aboveTheFold, setAboveTheFold] = useState(false)
  const visible = inView || aboveTheFold

  return (
    <div
      ref={(node) => {
        ref(node)
        if (node && node.getBoundingClientRect().top < window.innerHeight) setAboveTheFold(true)
      }}
      className={cn(
        "motion-safe:transition-[opacity,transform] motion-safe:duration-(--motion-slow) motion-safe:ease-smooth",
        !visible && "motion-safe:translate-y-4 motion-safe:opacity-0",
        className,
      )}
    >
      {children}
    </div>
  )
}

export { Reveal }
