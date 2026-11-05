import { Switch as SwitchPrimitive } from "@base-ui/react/switch"
import { cn } from "@/lib/utils"

/**
 * Công tắc bật/tắt. Base UI lo vai trò `switch`, phím Space/Enter và trạng thái `aria-checked`.
 * Màu theo ink-scale: tắt = viền control, bật = nền mực đậm. Luôn truyền `aria-label` (hoặc nhãn liền kề) cho trình đọc màn hình.
 */
function Switch({ className, ...props }: SwitchPrimitive.Root.Props) {
  return (
    <SwitchPrimitive.Root
      data-slot="switch"
      className={cn(
        "peer relative inline-flex h-5 w-9 shrink-0 cursor-pointer items-center rounded-4xl border",
        // Vùng bấm nới ra trên mobile mà công tắc vẫn giữ nguyên cỡ
        "max-md:before:absolute max-md:before:-inset-3 max-md:before:content-['']",
        "border-border-control bg-transparent transition-colors",
        "hover:border-ink-muted",
        "outline-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring",
        "data-checked:border-primary data-checked:bg-primary",
        "data-disabled:cursor-not-allowed data-disabled:opacity-45",
        className
      )}
      {...props}
    >
      <SwitchPrimitive.Thumb
        data-slot="switch-thumb"
        className={cn(
          "pointer-events-none block size-3.5 translate-x-0.5 rounded-4xl bg-ink-muted transition-transform",
          "data-checked:translate-x-4.5 data-checked:bg-primary-fg"
        )}
      />
    </SwitchPrimitive.Root>
  )
}

export { Switch }
