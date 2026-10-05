import * as React from "react"
import { cn } from "cn"

function Label({ className, ...props }: React.ComponentProps<"label">) {
  return (
    <label
      data-slot="label"
      className={cn(
        "flex items-center gap-1 text-body-sm font-medium text-ink select-none",
        "has-[+_:disabled]:text-ink-subtle",
        className
      )}
      {...props}
    />
  )
}

export { Label }
