import { Route } from "react-router-dom"
import StorefrontHomePage from "@/pages/storefront/home"
import { StorefrontLayoutContainer } from "./storefront-layout-container"

/** Khu khách hàng, chung một khung (header, chân trang). Trang cần đăng nhập (giỏ, tài khoản...) sẽ bọc `RequireAuth`. */
export const storefrontRoutes = (
  <Route element={<StorefrontLayoutContainer />}>
    <Route path="/" element={<StorefrontHomePage />} />
  </Route>
)
