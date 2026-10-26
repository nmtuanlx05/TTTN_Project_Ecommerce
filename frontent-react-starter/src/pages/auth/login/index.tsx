import { Link } from "react-router-dom"
import { AuthShell } from "@/features/auth/components/auth-shell"
import { LoginForm } from "@/features/auth/components/login-form"

function LoginPage() {
  return (
    <AuthShell
      title="Đăng nhập"
      description="Dùng email và mật khẩu của bạn để tiếp tục."
      footer={
        <>
          Chưa có tài khoản?{" "}
          <Link
            to="/register"
            className="text-ink underline underline-offset-4 hover:text-ink-muted"
          >
            Đăng ký
          </Link>
        </>
      }
    >
      <LoginForm />
    </AuthShell>
  )
}

export default LoginPage
