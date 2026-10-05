import { Button as ButtonPrimitive } from "@base-ui/react/button"
import { cva, type VariantProps } from "class-variance-authority"
import { LoaderCircle } from "lucide-react"
import { cn } from "cn"

/**
 * Bốn cấp nút, vẫn giữ đơn sắc:
 * - primary     nền mực đặc, chữ ngà. Mỗi màn chỉ MỘT nút cấp này.
 * - secondary   viền 1px, nền trong suốt.
 * - ghost       không viền, chỉ đổi nền khi hover.
 * - destructive màu danger, chỉ cho hành động xóa/hủy.
 *
 * "default" và "outline" là tên cũ của shadcn, giữ lại để component có sẵn
 * (sidebar, dropdown…) không vỡ.
 */
const buttonVariants = cva(
  [
    "group/button relative inline-flex shrink-0 items-center justify-center gap-inline",
    "rounded-xs border border-transparent whitespace-nowrap select-none",
    "font-medium transition-colors",
    "outline-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring",
    "disabled:pointer-events-none disabled:opacity-45",
    "data-[loading=true]:pointer-events-none",
    "[&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4",
  ],
  {
    variants: {
      variant: {
        primary:
          "bg-primary text-primary-fg hover:bg-primary-hover active:bg-primary-active",
        secondary:
          "border-border-strong bg-transparent text-ink hover:bg-surface-hover active:bg-surface-active",
        ghost:
          "bg-transparent text-ink hover:bg-surface-hover active:bg-surface-active",
        destructive:
          "bg-danger-solid text-danger-solid-fg hover:bg-danger-solid-hover active:bg-danger-solid",
        link: "text-ink underline underline-offset-4 hover:text-ink-muted",
        // Tên cũ của shadcn
        default:
          "bg-primary text-primary-fg hover:bg-primary-hover active:bg-primary-active",
        outline:
          "border-border-strong bg-transparent text-ink hover:bg-surface-hover active:bg-surface-active",
      },
      size: {
        // Chiều cao đi theo mật độ: 44px ở storefront, 36px ở admin
        // (admin tự nới về 44px dưới 768px, xem global.css)
        default: "h-control px-control-px text-body-sm",
        sm: "h-[calc(var(--sp-control-h)-6px)] px-3 text-body-sm",
        lg: "h-[calc(var(--sp-control-h)+6px)] px-6 text-body",
        icon: "size-control",
        "icon-sm": "size-[calc(var(--sp-control-h)-6px)]",
      },
    },
    defaultVariants: {
      variant: "primary",
      size: "default",
    },
  }
)

type ButtonProps = ButtonPrimitive.Props &
  VariantProps<typeof buttonVariants> & {
    /** Hiện spinner và khóa nút. Nhãn vẫn giữ nguyên chỗ để nút không nhảy. */
    loading?: boolean
  }

function Button({
  className,
  variant,
  size,
  loading = false,
  disabled,
  children,
  ...props
}: ButtonProps) {
  return (
    <ButtonPrimitive
      data-slot="button"
      data-loading={loading || undefined}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      className={cn(buttonVariants({ variant, size, className }))}
      {...props}
    >
      {loading ? (
        <>
          <LoaderCircle className="absolute animate-spin" aria-hidden="true" />
          <span className="inline-flex items-center gap-inline opacity-0">
            {children}
          </span>
        </>
      ) : (
        children
      )}
    </ButtonPrimitive>
  )
}

export { Button, buttonVariants }
export type { ButtonProps }
