import { useId, useState } from "react"
import { zodResolver } from "@hookform/resolvers/zod"
import { useForm } from "react-hook-form"
import { useNavigate } from "react-router-dom"
import { PasswordInput } from "@/components/shared/password-input"
import { Alert } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import { Field } from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { useToast } from "@/components/ui/toast"
import { applyServerErrors } from "@/lib/form-errors"
import { PASSWORD_HINT } from "@/lib/password-rules"
import { EMAIL_TAKEN_MESSAGE } from "../constants"
import { useRegister } from "../queries"
import { registerSchema, type RegisterFormValues } from "../schemas"
import type { RegisterInput } from "../types"

const REGISTER_FIELDS = ["email", "password", "name", "phone"] as const

function RegisterForm() {
  const id = useId()
  const navigate = useNavigate()
  const toast = useToast()
  const { mutate, isPending } = useRegister()
  const [formError, setFormError] = useState<string | null>(null)
  const {
    register,
    handleSubmit,
    setError,
    formState: { errors },
  } = useForm<RegisterFormValues>({
    resolver: zodResolver(registerSchema),
    defaultValues: { email: "", password: "", confirmPassword: "", name: "", phone: "" },
  })

  const onSubmit = (values: RegisterFormValues) => {
    if (isPending) return
    setFormError(null)
    // Họ tên và số điện thoại bỏ trống thì không gửi (backend báo 400 với chuỗi rỗng).
    const input: RegisterInput = {
      email: values.email,
      password: values.password,
      ...(values.name ? { name: values.name } : {}),
      ...(values.phone ? { phone: values.phone } : {}),
    }
    mutate(input, {
      onSuccess: (user) => {
        toast.add({
          title: "Đăng ký thành công, hãy đăng nhập",
          data: { tone: "success" },
        })
        navigate("/login", { replace: true, state: { email: user.email } })
      },
      onError: (error) => {
        if (error.statusCode === 409) {
          setError("email", { message: EMAIL_TAKEN_MESSAGE }, { shouldFocus: true })
          return
        }
        const general = applyServerErrors(error, setError, REGISTER_FIELDS)
        if (general) setFormError(general)
      },
    })
  }

  return (
    <form noValidate onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-stack">
      {formError ? (
        <Alert variant="danger" title="Chưa đăng ký được">
          {formError}
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
        description={PASSWORD_HINT}
        error={errors.password?.message}
        required
      >
        <PasswordInput {...register("password", { deps: ["confirmPassword"] })} />
      </Field>

      <Field
        label="Nhập lại mật khẩu"
        htmlFor={`${id}-confirm-password`}
        error={errors.confirmPassword?.message}
        required
      >
        <PasswordInput {...register("confirmPassword")} />
      </Field>

      <Field
        label="Họ tên"
        htmlFor={`${id}-name`}
        description="Không bắt buộc. Bỏ trống thì dùng phần trước @ của email."
        error={errors.name?.message}
      >
        <Input autoComplete="name" {...register("name")} />
      </Field>

      <Field
        label="Số điện thoại"
        htmlFor={`${id}-phone`}
        description="Không bắt buộc. Số di động Việt Nam, ví dụ 0912345678."
        error={errors.phone?.message}
      >
        <Input type="tel" inputMode="tel" autoComplete="tel" {...register("phone")} />
      </Field>

      <Button type="submit" loading={isPending} className="w-full">
        Đăng ký
      </Button>
    </form>
  )
}

export { RegisterForm }
