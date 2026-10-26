import { cn } from "@/lib/utils"
import { useTheme } from "@/hooks/use-theme"
import { ThemeCycleButton } from "@/components/shared/theme-cycle-button"
import { THEME_OPTIONS } from "@/components/shared/theme-options"

/**
 * Từ `md` trở lên: ba trạng thái sáng / tối / theo hệ thống, dựng bằng radiogroup để đi được
 * bằng bàn phím (Tab vào nhóm, mũi tên đổi). Dưới `md`: một nút xoay vòng đủ vùng bấm 44px
 * (`ThemeCycleButton`). Hook gọi một lần ở đây để hai bản luôn cùng một trạng thái.
 */
function ThemeToggle({ className }: { className?: string }) {
  const { choice, setChoice } = useTheme()

  return (
    <>
      <ThemeCycleButton choice={choice} onChange={setChoice} className={cn("md:hidden", className)} />
      <div
        role="radiogroup"
        aria-label="Chế độ hiển thị"
        className={cn(
          "hidden items-center gap-0.5 rounded-xs border border-border-default p-0.5 md:inline-flex",
          className
        )}
      >
        {THEME_OPTIONS.map(({ value, label, icon: Icon }) => {
          const selected = choice === value
          return (
            <button
              key={value}
              type="button"
              role="radio"
              aria-checked={selected}
              aria-label={label}
              title={label}
              tabIndex={selected ? 0 : -1}
              onClick={() => setChoice(value)}
              onKeyDown={(event) => {
                if (event.key !== "ArrowRight" && event.key !== "ArrowLeft") return
                event.preventDefault()
                const index = THEME_OPTIONS.findIndex((option) => option.value === choice)
                const step = event.key === "ArrowRight" ? 1 : -1
                const next = (index + step + THEME_OPTIONS.length) % THEME_OPTIONS.length
                setChoice(THEME_OPTIONS[next].value)
              }}
              className={cn(
                "inline-flex size-8 items-center justify-center rounded-xs transition-colors",
                "outline-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring",
                selected
                  ? "bg-primary text-primary-fg"
                  : "text-ink-muted hover:bg-surface-hover hover:text-ink"
              )}
            >
              <Icon className="size-4" aria-hidden="true" />
            </button>
          )
        })}
      </div>
    </>
  )
}

export { ThemeToggle }
