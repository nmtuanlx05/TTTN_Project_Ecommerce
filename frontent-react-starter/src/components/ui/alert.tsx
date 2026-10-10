import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"
import { CircleAlert, CircleCheck, Info, TriangleAlert } from "lucide-react"
import { cn } from "@/lib/utils"

const alertVariants = cva(
  "flex items-start gap-inline rounded-md border p-card text-body-sm",
  {
    variants: {
      variant: {
        success: "border-success-border bg-success-tint text-success-fg",
        warning: "border-warning-border bg-warning-tint text-warning-fg",
        danger: "border-danger-border bg-danger-tint text-danger-fg",
        info: "border-info-border bg-info-tint text-info-fg",
      },
    },
    defaultVariants: { variant: "info" },
  }
)

const ICONS = {
  success: CircleCheck,
  warning: TriangleAlert,
  danger: CircleAlert,
  info: Info,
} as const

function Alert({
  className,
  variant = "info",
  title,
  children,
  ...props
}: React.ComponentProps<"div"> &
  VariantProps<typeof alertVariants> & { title?: string }) {
  const Icon = ICONS[variant ?? "info"]
  return (
    <div
      data-slot="alert"
      role={variant === "danger" ? "alert" : "status"}
      className={cn(alertVariants({ variant }), className)}
      {...props}
    >
      <Icon className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
      <div className="flex flex-col gap-1">
        {title ? <p className="font-semibold">{title}</p> : null}
        {children ? <div>{children}</div> : null}
      </div>
    </div>
  )
}

export { Alert, alertVariants }
