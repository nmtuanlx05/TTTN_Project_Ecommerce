import { Route } from "react-router-dom"
import StorefrontCatalogPage from "@/pages/storefront/catalog"
import StorefrontHomePage from "@/pages/storefront/home"
import StorefrontNotFoundPage from "@/pages/storefront/not-found"
import StorefrontProductDetailPage from "@/pages/storefront/product-detail"
import { StorefrontLayoutContainer } from "./storefront-layout-container"

/** Khu khách hàng, chung một khung (header, chân trang). Trang cần đăng nhập (giỏ, tài khoản...) sẽ bọc `RequireAuth`. */
export const storefrontRoutes = (
  <Route element={<StorefrontLayoutContainer />}>
    <Route path="/" element={<StorefrontHomePage />} />
    <Route path="/products" element={<StorefrontCatalogPage />} />
    <Route path="/products/:slug" element={<StorefrontProductDetailPage />} />
    {/* 404 trong khung storefront: đứng trước route `*` cũ ở App nên được chọn; /admin/* và các trang khác khớp route cụ thể hơn. */}
    <Route path="*" element={<StorefrontNotFoundPage />} />
  </Route>
)
