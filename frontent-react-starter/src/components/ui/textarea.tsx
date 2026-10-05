import * as React from "react"
import { cn } from "cn"
import { controlClasses } from "@/components/ui/input"

function Textarea({ className, ...props }: React.ComponentProps<"textarea">) {
  return (
    <textarea
      data-slot="textarea"
      className={cn(
        controlClasses,
        "min-h-24 resize-y px-3 py-2 leading-[1.55]",
        className
      )}
      {...props}
    />
  )
}

export { Textarea }
