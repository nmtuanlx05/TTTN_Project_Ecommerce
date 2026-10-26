import { useEffect, useId, useState } from "react"
import { zodResolver } from "@hookform/resolvers/zod"
import { useForm } from "react-hook-form"
import { useLocation } from "react-router-dom"
import { PasswordInput } from "@/components/shared/password-input"
import { Alert } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import { Field } from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import type { ApiError } from "@/lib/api-error"
import { applyServerErrors } from "@/lib/form-errors"
import { SESSION_EXPIRED_MESSAGE } from "../constants"
import { useLogin } from "../queries"
import { loginSchema, type LoginFormValues } from "../schemas"
import { useSessionExpiredNotice } from "../use-session-expired-notice"

const LOGIN_FIELDS = ["email", "password"] as const


/** Thông điệp riêng theo status; `null` thì dùng thông điệp chung từ server. */
function statusMessage(error: ApiError): string | null {
  if (error.statusCode === 401) {
    return "Email hoặc mật khẩu chưa đúng. Kiểm tra lại rồi thử lần nữa."
  }
  if (error.statusCode === 403) {
    return "Tài khoản này đã bị khóa. Liên hệ cửa hàng để được mở khóa."
  }
  return null
}

function LoginForm() {
  const id = useId()
  const sessionExpired = useSessionExpiredNotice()
  const { mutate, isPending } = useLogin()
  const [formError, setFormError] = useState<string | null>(null)
  // Trang đăng ký chuyển sang đây kèm email vừa đăng ký (chỉ email, không có mật khẩu).
  const state = useLocation().state as { email?: unknown } | null
  const initialEmail = typeof state?.email === "string" ? state.email : ""
  const {
    register,
    handleSubmit,
    setError,
    setFocus,
    resetField,
    formState: { errors },
  } = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: initialEmail, password: "" },
  })

  useEffect(() => {
    if (initialEmail) setFocus("password")
  }, [initialEmail, setFocus])

  const onSubmit = (values: LoginFormValues) => {
    if (isPending) return
    setFormError(null)
    mutate(values, {
      onError: (error) => {
        const general = applyServerErrors(error, setError, LOGIN_FIELDS)
        const message = statusMessage(error) ?? general
        if (message) setFormError(message)
        // Sai thông tin: xóa mật khẩu đã nhập và đưa con trỏ về ô đó để nhập lại.
        if (error.statusCode === 401) {
          resetField("password")
          setFocus("password")
        }
      },
    })
  }

  return (
    <form noValidate onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-stack">
      {formError ? (
        <Alert variant="danger" title="Không đăng nhập được">
          {formError}
        </Alert>
      ) : sessionExpired ? (
        <Alert variant="warning" title="Bạn đã bị đăng xuất">
          {SESSION_EXPIRED_MESSAGE}
        </Alert>
      ) : null}

      <Field label="Email" htmlFor={`${id}-email`} error={errors.email?.message} required>
        <Input
          type="email"
          inputMode="email"
          autoComplete="username"
          autoCapitalize="none"
          spellCheck={false}
          {...register("email")}
        />
      </Field>

      <Field
        label="Mật khẩu"
        htmlFor={`${id}-password`}
        error={errors.password?.message}
        required
      >
        <PasswordInput autoComplete="current-password" {...register("password")} />
      </Field>

      <Button type="submit" loading={isPending} className="w-full">
        Đăng nhập
      </Button>
    </form>
  )
}

export { LoginForm }
