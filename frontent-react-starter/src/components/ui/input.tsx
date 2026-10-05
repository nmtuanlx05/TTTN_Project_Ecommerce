import * as React from "react"
import { Input as InputPrimitive } from "@base-ui/react/input"
import { cn } from "cn"

const controlClasses = [
  "w-full min-w-0 rounded-xs border bg-transparent",
  "border-border-control text-ink",
  "text-body-sm transition-colors outline-none",
  "placeholder:text-ink-subtle",
  "hover:border-ink-muted",
  "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring",
  "disabled:cursor-not-allowed disabled:bg-surface-sunken disabled:text-ink-subtle disabled:opacity-70",
  "aria-invalid:border-danger-fg aria-invalid:focus-visible:outline-danger-fg",
]

function Input({ className, type, ...props }: React.ComponentProps<"input">) {
  return (
    <InputPrimitive
      type={type}
      data-slot="input"
      className={cn(controlClasses, "h-control px-3", className)}
      {...props}
    />
  )
}

export { Input, controlClasses }
