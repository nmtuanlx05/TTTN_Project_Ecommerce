import { Toast as ToastPrimitive } from "@base-ui/react/toast"
import { CircleAlert, CircleCheck, Info, TriangleAlert, X } from "lucide-react"
import { cn } from "@/lib/utils"

/**
 * Toast dùng Base UI (đã nằm trong gói shadcn base-nova), không thêm thư viện.
 * Bọc ứng dụng bằng <ToastProvider> rồi gọi useToast() để đẩy thông báo.
 */
const ToastProvider = ToastPrimitive.Provider
const useToast = ToastPrimitive.useToastManager

const TONE_CLASSES = {
  success: "border-success-border bg-success-tint text-success-fg",
  warning: "border-warning-border bg-warning-tint text-warning-fg",
  danger: "border-danger-border bg-danger-tint text-danger-fg",
  info: "border-info-border bg-info-tint text-info-fg",
} as const

const TONE_ICONS = {
  success: CircleCheck,
  warning: TriangleAlert,
  danger: CircleAlert,
  info: Info,
} as const

type ToastTone = keyof typeof TONE_CLASSES

function ToastViewport({ className }: { className?: string }) {
  const { toasts } = useToast()

  return (
    <ToastPrimitive.Portal>
      <ToastPrimitive.Viewport
        className={cn(
          "fixed right-4 bottom-4 z-50 flex w-[min(24rem,calc(100vw-2rem))] flex-col gap-2",
          className
        )}
      >
        {toasts.map((toast) => {
          const tone = (toast.data as { tone?: ToastTone } | undefined)?.tone ?? "info"
          const Icon = TONE_ICONS[tone]
          return (
            <ToastPrimitive.Root
              key={toast.id}
              toast={toast}
              className={cn(
                "flex items-start gap-inline rounded-md border p-4 text-body-sm",
                TONE_CLASSES[tone]
              )}
            >
              <Icon className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
              <div className="flex min-w-0 flex-1 flex-col gap-0.5">
                <ToastPrimitive.Title className="font-semibold" />
                <ToastPrimitive.Description />
              </div>
              <ToastPrimitive.Close
                aria-label="Đóng thông báo"
                className={cn(
                  "-m-1 shrink-0 rounded-xs p-1 opacity-70 transition-opacity",
                  "hover:opacity-100",
                  "outline-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-current"
                )}
              >
                <X className="size-4" />
              </ToastPrimitive.Close>
            </ToastPrimitive.Root>
          )
        })}
      </ToastPrimitive.Viewport>
    </ToastPrimitive.Portal>
  )
}

export { ToastProvider, ToastViewport, useToast }
export type { ToastTone }
