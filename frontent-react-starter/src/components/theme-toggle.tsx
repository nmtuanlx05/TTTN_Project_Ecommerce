import { Monitor, Moon, Sun } from "lucide-react"
import { cn } from "cn"
import { useTheme, type ThemeChoice } from "@/hooks/use-theme"

const OPTIONS: { value: ThemeChoice; label: string; icon: typeof Sun }[] = [
  { value: "light", label: "Sáng", icon: Sun },
  { value: "dark", label: "Tối", icon: Moon },
  { value: "system", label: "Theo hệ thống", icon: Monitor },
]

/**
 * Ba trạng thái: sáng / tối / theo hệ thống.
 * Dựng bằng radiogroup để đi được bằng bàn phím (Tab vào nhóm, mũi tên đổi).
 */
function ThemeToggle({ className }: { className?: string }) {
  const { choice, setChoice } = useTheme()

  return (
    <div
      role="radiogroup"
      aria-label="Chế độ hiển thị"
      className={cn(
        "inline-flex items-center gap-0.5 rounded-xs border border-border-default p-0.5",
        className
      )}
    >
      {OPTIONS.map(({ value, label, icon: Icon }) => {
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
              const index = OPTIONS.findIndex((option) => option.value === choice)
              const step = event.key === "ArrowRight" ? 1 : -1
              const next = (index + step + OPTIONS.length) % OPTIONS.length
              setChoice(OPTIONS[next].value)
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
  )
}

export { ThemeToggle }
