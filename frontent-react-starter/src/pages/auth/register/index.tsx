import { Link, useLocation } from "react-router-dom"
import { AuthShell } from "@/features/auth/components/auth-shell"
import { RegisterForm } from "@/features/auth/components/register-form"
import { returnPathState } from "@/features/auth/safe-redirect"

function RegisterPage() {
  const location = useLocation()
  return (
    <AuthShell
      title="Đăng ký"
      description="Tạo tài khoản bằng email và mật khẩu."
      footer={
        <>
          Đã có tài khoản?{" "}
          <Link
            to="/login"
            state={returnPathState(location.state)}
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
