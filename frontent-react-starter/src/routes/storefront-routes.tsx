import { Route } from "react-router-dom"
import StorefrontCartPage from "@/pages/storefront/cart"
import StorefrontCheckoutPage from "@/pages/storefront/checkout"
import StorefrontCatalogPage from "@/pages/storefront/catalog"
import StorefrontHomePage from "@/pages/storefront/home"
import StorefrontInfoPage from "@/pages/storefront/info"
import StorefrontOrderSuccessPage from "@/pages/storefront/order-success"
import StorefrontNotFoundPage from "@/pages/storefront/not-found"
import StorefrontProductDetailPage from "@/pages/storefront/product-detail"
import StorefrontStoresPage from "@/pages/storefront/stores"
import { RequireAuth } from "./guards/require-auth"
import { StorefrontLayoutContainer } from "./storefront-layout-container"

/** Khu khách hàng, chung một khung (header, chân trang). Trang cần đăng nhập (giỏ hàng, tài khoản...) bọc `RequireAuth`. */
export const storefrontRoutes = (
  <Route element={<StorefrontLayoutContainer />}>
    <Route path="/" element={<StorefrontHomePage />} />
    <Route path="/products" element={<StorefrontCatalogPage />} />
    <Route path="/products/:slug" element={<StorefrontProductDetailPage />} />
    <Route path="/dia-chi" element={<StorefrontStoresPage />} />
    <Route element={<RequireAuth />}>
      <Route path="/gio-hang" element={<StorefrontCartPage />} />
      <Route path="/thanh-toan" element={<StorefrontCheckoutPage />} />
      <Route path="/dat-hang-thanh-cong/:code" element={<StorefrontOrderSuccessPage />} />
    </Route>
    <Route path="/thong-tin/:slug" element={<StorefrontInfoPage />} />
    {/* 404 trong khung storefront: đứng trước route `*` cũ ở App nên được chọn; /admin/* và các trang khác khớp route cụ thể hơn. */}
    <Route path="*" element={<StorefrontNotFoundPage />} />
  </Route>
)
