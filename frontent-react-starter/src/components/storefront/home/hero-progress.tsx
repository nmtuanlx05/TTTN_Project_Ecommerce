import { cn } from "@/lib/utils"

/**
 * Thanh tiến trình của hero: một đoạn cho mỗi slide, MỖI ĐOẠN LÀ MỘT NÚT (cao 44px để chạm được, vạch nhìn thấy chỉ 2px) có nhãn riêng.
 * Đoạn của slide đang xem là `ink`, các đoạn còn lại `border-control` (≥ 3:1 với nền, đã đo 3,79); đang xem còn có `aria-current` (không chỉ dựa vào màu).
 */
function HeroProgress({
  titles,
  index,
  onSelect,
}: {
  titles: readonly string[]
  index: number
  onSelect: (target: number) => void
}) {
  return (
    <div className="flex min-w-0 max-w-48 flex-1">
      {titles.map((title, target) => (
        <button
          key={title}
          type="button"
          aria-label={`Đến slide ${target + 1}: ${title}`}
          aria-current={target === index ? "true" : undefined}
          onClick={() => onSelect(target)}
          className="group/segment flex h-control flex-1 items-center"
        >
          <span
            aria-hidden="true"
            className={cn(
              "h-0.5 w-full transition-colors duration-(--motion-base) ease-smooth",
              target === index ? "bg-ink" : "bg-border-control group-hover/segment:bg-ink-muted",
            )}
          />
        </button>
      ))}
    </div>
  )
}

export { HeroProgress }
