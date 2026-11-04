import { useState } from "react"
import { zodResolver } from "@hookform/resolvers/zod"
import { useForm } from "react-hook-form"
import { subscribeNewsletter } from "./api"
import { newsletterSchema, type NewsletterFormValues } from "./schemas"

/**
 * Trạng thái form nhận tin: kiểm tra email (RHF + zod), gọi `subscribeNewsletter` rồi giữ lại thông báo của nó.
 * Không xóa ô nhập sau khi gửi. Sửa email thì thông báo cũ biến mất để không còn nói về giá trị đã đổi.
 */
export function useNewsletterForm() {
  const [notice, setNotice] = useState<string | null>(null)
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<NewsletterFormValues>({
    resolver: zodResolver(newsletterSchema),
    defaultValues: { email: "" },
  })

  const emailField = register("email", { onChange: () => setNotice(null) })
  const onSubmit = handleSubmit(async ({ email }) => {
    const result = await subscribeNewsletter(email)
    setNotice(result.message)
  })

  return { emailField, emailError: errors.email?.message, isSubmitting, notice, onSubmit }
}
