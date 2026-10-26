import { cn } from "@/lib/utils"
import type { ThemeChoice } from "@/hooks/use-theme"
import { THEME_OPTIONS } from "@/components/shared/theme-options"

/**
 * Bản mobile của ThemeToggle: một nút 44px, bấm để xoay sáng → tối → theo hệ thống.
 * Icon đổi theo chế độ hiện tại; aria-label nói chế độ hiện tại và chế độ sẽ chuyển tới.
 */
function ThemeCycleButton({
  choice,
  onChange,
  className,
}: {
  choice: ThemeChoice
  onChange: (next: ThemeChoice) => void
  className?: string
}) {
  const index = THEME_OPTIONS.findIndex((option) => option.value === choice)
  const current = THEME_OPTIONS[index]
  const next = THEME_OPTIONS[(index + 1) % THEME_OPTIONS.length]
  const Icon = current.icon

  return (
    <button
      type="button"
      aria-label={`Chế độ hiển thị: ${current.label}. Bấm để chuyển sang ${next.label}`}
      title={current.label}
      onClick={() => onChange(next.value)}
      className={cn(
        "inline-flex size-control items-center justify-center rounded-xs border border-border-default text-ink-muted transition-colors",
        "outline-none hover:bg-surface-hover hover:text-ink",
        "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring",
        className
      )}
    >
      <Icon className="size-4" aria-hidden="true" />
    </button>
  )
}

export { ThemeCycleButton }
