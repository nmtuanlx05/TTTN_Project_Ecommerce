import { Route } from "react-router-dom"
import LoginPage from "@/pages/auth/login"
import RegisterPage from "@/pages/auth/register"
import { RedirectIfAuthenticated } from "./guards/redirect-if-authenticated"

/** /login và /register: đã đăng nhập thì không vào lại được. */
export const authRoutes = (
  <Route element={<RedirectIfAuthenticated />}>
    <Route path="/login" element={<LoginPage />} />
    <Route path="/register" element={<RegisterPage />} />
  </Route>
)
