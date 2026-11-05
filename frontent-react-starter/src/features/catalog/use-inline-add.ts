import { useState } from "react"
import { useCartUi } from "@/components/storefront/cart-ui-context"
import { useToast } from "@/components/ui/toast"
import { ApiError } from "@/lib/api-error"
import { useFetchCatalogProduct } from "./queries"
import type { CatalogProductDetail } from "./types"
import { defaultChoice, type VariantChoice } from "./variant-options"

/**
 * "Thêm vào giỏ hàng" từ thẻ trong ngăn kéo yêu thích (số lượng cố định 1). Chi tiết (biến thể) chỉ tải KHI BẤM, không tải trước cho cả danh sách (dùng cache nếu đã có). Cùng luật với
 * `useQuickAdd`: đúng MỘT biến thể thì thêm thẳng; từ hai biến thể trở lên thì `onNeedChoice` để thẻ mở vùng chọn. Không có biến thể bán / hết hàng thì toast, không mở vùng chọn.
 * Thêm THÀNH CÔNG (phản hồi `POST /cart/items` đã về) thì `addToCart(..., { openCart: true })` mở ngăn kéo giỏ, KHÔNG toast (giỏ mở ra là phản hồi); việc đóng ngăn kéo yêu thích do routes xử lý
 * (`use-wishlist-wiring`: thấy giỏ mở khi yêu thích đang mở thì chuyển cảnh). Thất bại: không mở gì, lỗi đã được toast trong `useAddToCart`.
 */
export function useInlineAdd(slug: string) {
  const { addToCart, adding } = useCartUi()
  const fetchProduct = useFetchCatalogProduct()
  const toast = useToast()
  const [loading, setLoading] = useState(false)
  const [detail, setDetail] = useState<CatalogProductDetail | null>(null)
  const [choice, setChoice] = useState<VariantChoice | null>(null)

  const confirm = async (variantId: number): Promise<boolean> => {
    return addToCart({ variantId, quantity: 1 }, { openCart: true })
  }

  /** Trả `"expand"` khi cần vùng chọn, `"added"` khi đã thêm thẳng, `"none"` khi không thêm được (đã toast). */
  const start = async (): Promise<"expand" | "added" | "none"> => {
    setLoading(true)
    try {
      const product = await fetchProduct(slug)
      if (product.variants.length === 0) {
        toast.add({ title: "Sản phẩm không còn bán", data: { tone: "danger" } })
        return "none"
      }
      if (product.variants.length === 1) {
        const [only] = product.variants
        if (!only.inStock) {
          toast.add({ title: "Sản phẩm đã hết hàng", data: { tone: "danger" } })
          return "none"
        }
        return (await confirm(only.id)) ? "added" : "none"
      }
      setDetail(product)
      setChoice(defaultChoice(product.variants))
      return "expand"
    } catch (error) {
      toast.add({ title: `${ApiError.from(error).message} Hãy thử lại.`, data: { tone: "danger" } })
      return "none"
    } finally {
      setLoading(false)
    }
  }

  return { loading, adding, detail, choice, setChoice, start, confirm }
}
