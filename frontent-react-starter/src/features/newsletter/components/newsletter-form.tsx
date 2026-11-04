import { useId } from "react"
import { Info } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { STORE } from "@/lib/store-info"
import { useNewsletterForm } from "../use-newsletter-form"

/**
 * Form đăng ký nhận tin ở chân trang (chỉ GIAO DIỆN, backend chưa có). Nhãn của ô nhập ẩn bằng `sr-only` (placeholder không thay được nhãn).
 * Từ `xl` ô nhập và nút cùng một hàng (đã đo: cột đủ rộng), dưới đó xếp dọc. Một vùng `aria-live="polite"` luôn có mặt để đọc
 * lỗi hoặc thông báo; thông báo "đang hoàn thiện" dùng token `info`, không phải màu lỗi. Dựng trong phạm vi tối của chân trang.
 */
function NewsletterForm() {
  const id = useId()
  const errorId = `${id}-error`
  const { emailField, emailError, isSubmitting, notice, onSubmit } = useNewsletterForm()

  return (
    <form noValidate onSubmit={onSubmit} className="flex flex-col gap-3">
      <div className="flex flex-col gap-3 xl:flex-row">
        <label htmlFor={id} className="sr-only">
          {STORE.newsletter.emailLabel}
        </label>
        <Input
          id={id}
          type="email"
          inputMode="email"
          autoComplete="email"
          placeholder={STORE.newsletter.emailLabel}
          aria-invalid={emailError ? true : undefined}
          aria-describedby={emailError ? errorId : undefined}
          className="xl:min-w-44 xl:flex-1"
          {...emailField}
        />
        <Button type="submit" loading={isSubmitting} className="xl:shrink-0">
          {STORE.newsletter.submitLabel}
        </Button>
      </div>
      <div aria-live="polite">
        {emailError ? (
          <p id={errorId} className="text-body-sm text-danger-fg">
            {emailError}
          </p>
        ) : notice ? (
          <p className="flex items-start gap-2 text-body-sm text-info-fg">
            <Info className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
            {notice}
          </p>
        ) : null}
      </div>
    </form>
  )
}

export { NewsletterForm }
