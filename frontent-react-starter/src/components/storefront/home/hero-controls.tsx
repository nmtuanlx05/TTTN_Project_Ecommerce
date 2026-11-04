import { ArrowLeft, ArrowRight } from "lucide-react"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { HERO_TEXT_WIDTH_CLASS } from "./hero-layout"
import { HeroProgress } from "./hero-progress"

/** Hai chữ số cho bộ đếm: 1 → "01". */
const pad = (value: number) => String(value).padStart(2, "0")

/** Nút viền dùng `border-control` (≥ 3:1, đã đo 3,79) thay cho `border-strong` (2,37) của `secondary`: viền là ranh giới của điều khiển. */
const ARROW_CLASS = "border-border-control"

/**
 * Hàng điều khiển của hero, nằm đè ở đáy khối: bộ đếm "01 / 03", thanh tiến trình bấm được, hai nút mũi tên vuông 44px. Từ `lg` hàng này chỉ rộng
 * bằng cột chữ (46%) và canh theo mép trái container như chữ. Chỉ đổi slide khi người dùng bấm; không có tự chạy.
 */
function HeroControls({
  titles,
  index,
  onSelect,
  onPrev,
  onNext,
}: {
  titles: readonly string[]
  index: number
  onSelect: (target: number) => void
  onPrev: () => void
  onNext: () => void
}) {
  return (
    <div className={cn("absolute inset-x-0 bottom-5 flex items-center gap-4 px-gutter lg:right-auto lg:bottom-8 lg:pr-12 lg:pl-(--container-inset)", HERO_TEXT_WIDTH_CLASS)}>
      <p className="text-body-sm font-semibold text-ink tabular-nums">
        {pad(index + 1)} / {pad(titles.length)}
      </p>
      <HeroProgress titles={titles} index={index} onSelect={onSelect} />
      <div className="ml-auto flex gap-2">
        <Button variant="secondary" size="icon" aria-label="Slide trước" onClick={onPrev} className={ARROW_CLASS}>
          <ArrowLeft aria-hidden="true" />
        </Button>
        <Button variant="secondary" size="icon" aria-label="Slide sau" onClick={onNext} className={ARROW_CLASS}>
          <ArrowRight aria-hidden="true" />
        </Button>
      </div>
    </div>
  )
}

export { HeroControls }
