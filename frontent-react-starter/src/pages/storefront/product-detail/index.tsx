import { Navigate, useParams } from "react-router-dom"
import { useRequireLogin } from "@/features/auth/use-require-login"
import { ProductDetailContent } from "@/features/catalog/components/product-detail-content"

/**
 * /products/:slug — chi tiết sản phẩm công khai. Thêm vào giỏ đi qua cổng đăng nhập (`useRequireLogin`): khách sang /login
 * rồi quay lại đúng trang này. TẠM: chưa có giỏ hàng nên với CUSTOMER chỉ hiện toast, nhánh giỏ hàng sẽ thay.
 */
function StorefrontProductDetailPage() {
  const { slug } = useParams()
  const requireLogin = useRequireLogin()

  if (!slug) return <Navigate to="/products" replace />
  return <ProductDetailContent slug={slug} onAddToCart={() => requireLogin()} />
}

export default StorefrontProductDetailPage
