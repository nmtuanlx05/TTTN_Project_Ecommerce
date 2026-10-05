import { Checkbox as CheckboxPrimitive } from "@base-ui/react/checkbox"
import { Check, Minus } from "lucide-react"
import { cn } from "cn"

function Checkbox({ className, ...props }: CheckboxPrimitive.Root.Props) {
  return (
    <CheckboxPrimitive.Root
      data-slot="checkbox"
      className={cn(
        "peer relative flex size-5 shrink-0 items-center justify-center rounded-xs border",
        // Vùng bấm nới ra 44x44 trên mobile mà ô vuông vẫn giữ nguyên cỡ
        "max-md:before:absolute max-md:before:-inset-3 max-md:before:content-['']",
        "border-border-control bg-transparent transition-colors",
        "hover:border-ink-muted",
        "outline-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring",
        "data-checked:border-primary data-checked:bg-primary data-checked:text-primary-fg",
        "data-indeterminate:border-primary data-indeterminate:bg-primary data-indeterminate:text-primary-fg",
        "disabled:cursor-not-allowed disabled:opacity-45",
        "aria-invalid:border-danger-fg",
        className
      )}
      {...props}
    >
      <CheckboxPrimitive.Indicator className="flex items-center justify-center">
        {props.indeterminate ? (
          <Minus className="size-3.5" strokeWidth={3} />
        ) : (
          <Check className="size-3.5" strokeWidth={3} />
        )}
      </CheckboxPrimitive.Indicator>
    </CheckboxPrimitive.Root>
  )
}

export { Checkbox }
