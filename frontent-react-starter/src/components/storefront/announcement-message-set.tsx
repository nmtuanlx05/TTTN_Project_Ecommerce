import { Fragment, type ComponentProps } from "react"
import { cn } from "@/lib/utils"

/**
 * Một lượt các thông điệp: hai thông điệp liền nhau ngăn bằng nét "|" mảnh, hết lượt thì có một chấm nhỏ để nối sang lượt lặp kế.
 * Nét ngăn và chấm chỉ để trang trí nên `aria-hidden`. Khi người dùng giảm chuyển động, dải không chạy: chỉ giữ thông điệp đầu
 * (các phần còn lại ẩn bằng `motion-reduce:hidden`, không cần JS).
 */
function AnnouncementMessageSet({
  messages,
  className,
  ...props
}: { messages: string[] } & Omit<ComponentProps<"ul">, "children">) {
  return (
    <ul className={cn("flex shrink-0 items-center motion-reduce:min-w-0 motion-reduce:shrink", className)} {...props}>
      {messages.map((message, index) => (
        <Fragment key={message}>
          {index > 0 ? <li aria-hidden="true" className="h-3 w-px bg-ink-muted motion-reduce:hidden" /> : null}
          <li
            className={cn(
              "px-gutter text-overline whitespace-nowrap text-ink uppercase motion-reduce:text-center motion-reduce:whitespace-normal",
              index > 0 && "motion-reduce:hidden",
            )}
          >
            {message}
          </li>
        </Fragment>
      ))}
      <li aria-hidden="true" className="size-1.5 rounded-4xl bg-ink-muted motion-reduce:hidden" />
    </ul>
  )
}

export { AnnouncementMessageSet }
