import { Navigate, useParams } from "react-router-dom"
import { useCartUi } from "@/components/storefront/cart-ui-context"
import { ProductDetailContent } from "@/features/catalog/components/product-detail-content"

/**
 * /products/:slug — chi tiết sản phẩm công khai. Thêm vào giỏ đi qua `useCartUi().addToCart` (đã gồm cổng đăng nhập: khách sang /login rồi quay lại đúng trang này,
 * không tự thêm món đang chờ): thành công thì ngăn kéo giỏ mở; lỗi hiện message của backend; `adding` khóa nút trong lúc gửi.
 */
function StorefrontProductDetailPage() {
  const { slug } = useParams()
  const { addToCart, adding } = useCartUi()

  if (!slug) return <Navigate to="/products" replace />
  return <ProductDetailContent slug={slug} onAddToCart={(input) => void addToCart(input)} addingToCart={adding} />
}

export default StorefrontProductDetailPage
