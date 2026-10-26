import { Link } from "react-router-dom"
import { AuthShell } from "@/features/auth/components/auth-shell"
import { RegisterForm } from "@/features/auth/components/register-form"

function RegisterPage() {
  return (
    <AuthShell
      title="Đăng ký"
      description="Tạo tài khoản bằng email và mật khẩu."
      footer={
        <>
          Đã có tài khoản?{" "}
          <Link
            to="/login"
            className="text-ink underline underline-offset-4 hover:text-ink-muted"
          >
            Đăng nhập
          </Link>
        </>
      }
    >
      <RegisterForm />
    </AuthShell>
  )
}

export default RegisterPage
