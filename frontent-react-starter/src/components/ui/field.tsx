import * as React from "react"
import { CircleAlert } from "lucide-react"
import { cn } from "cn"
import { Label } from "@/components/ui/label"

/**
 * Bọc một ô nhập: nhãn + control + mô tả + báo lỗi.
 * Thuần trình bày, không giữ state — để react-hook-form lo phần kiểm tra.
 */
function Field({
  label,
  htmlFor,
  description,
  error,
  required,
  className,
  children,
}: {
  label: string
  htmlFor: string
  description?: string
  error?: string
  required?: boolean
  className?: string
  children: React.ReactNode
}) {
  const describedBy = [
    description ? `${htmlFor}-description` : null,
    error ? `${htmlFor}-error` : null,
  ]
    .filter(Boolean)
    .join(" ")

  return (
    <div className={cn("flex flex-col gap-1.5", className)}>
      <Label htmlFor={htmlFor}>
        {label}
        {required ? (
          <span className="text-danger-fg" aria-hidden="true">
            *
          </span>
        ) : null}
      </Label>

      {React.isValidElement<React.AriaAttributes & { id?: string }>(children)
        ? React.cloneElement(children, {
            id: htmlFor,
            "aria-invalid": error ? true : undefined,
            "aria-describedby": describedBy || undefined,
          })
        : children}

      {description && !error ? (
        <p id={`${htmlFor}-description`} className="text-caption text-ink-muted">
          {description}
        </p>
      ) : null}

      {error ? (
        <p
          id={`${htmlFor}-error`}
          role="alert"
          className="flex items-start gap-1.5 text-caption text-danger-fg"
        >
          <CircleAlert className="mt-px size-3.5 shrink-0" aria-hidden="true" />
          {error}
        </p>
      ) : null}
    </div>
  )
}

export { Field }
