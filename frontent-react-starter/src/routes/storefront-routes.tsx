import { Navigate, Route } from "react-router-dom"
import StorefrontCartPage from "@/pages/storefront/cart"
import StorefrontCheckoutPage from "@/pages/storefront/checkout"
import StorefrontCatalogPage from "@/pages/storefront/catalog"
import StorefrontHomePage from "@/pages/storefront/home"
import StorefrontInfoPage from "@/pages/storefront/info"
import StorefrontOrderSuccessPage from "@/pages/storefront/order-success"
import StorefrontPaymentPage from "@/pages/storefront/payment"
import StorefrontMyOrderDetailPage from "@/pages/storefront/my-order-detail"
import StorefrontMyOrdersPage from "@/pages/storefront/my-orders"
import StorefrontNotFoundPage from "@/pages/storefront/not-found"
import StorefrontProductDetailPage from "@/pages/storefront/product-detail"
import StorefrontStoresPage from "@/pages/storefront/stores"
import { AccountLayoutContainer } from "./account-layout-container"
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
      <Route path="/thanh-toan-online/:code" element={<StorefrontPaymentPage />} />
      <Route path="/tai-khoan" element={<AccountLayoutContainer />}>
        <Route index element={<Navigate to="don-hang" replace />} />
        <Route path="don-hang" element={<StorefrontMyOrdersPage />} />
        <Route path="don-hang/:code" element={<StorefrontMyOrderDetailPage />} />
      </Route>
    </Route>
    <Route path="/thong-tin/:slug" element={<StorefrontInfoPage />} />
    {/* 404 trong khung storefront: đứng trước route `*` cũ ở App nên được chọn; /admin/* và các trang khác khớp route cụ thể hơn. */}
    <Route path="*" element={<StorefrontNotFoundPage />} />
  </Route>
)
