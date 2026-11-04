import { useRef, useState } from "react"
import { useToast } from "@/components/ui/toast"
import { useCartUi } from "@/components/storefront/cart-ui-context"
import { ApiError } from "@/lib/api-error"
import { useFetchCatalogProduct } from "./queries"
import type { CatalogProductDetail } from "./types"

/**
 * "Thêm nhanh" của một thẻ sản phẩm. Qua cổng đăng nhập (khách sang /login ngay, chưa tải gì), rồi tải chi tiết (dùng cache nếu đã tải trước khi rê chuột); `loading` khóa nút
 * trong lúc chờ. Lỗi tải: toast, nút mở lại để thử lại. Sản phẩm có ĐÚNG MỘT biến thể tổng cộng thì thêm thẳng 1 cái; từ hai biến thể trở lên (kể cả khi chỉ một cái còn hàng)
 * thì mở hộp thoại chọn phân loại. Thành công thì ngăn kéo giỏ mở: nhánh thêm thẳng mở ngay (`addToCart` của `useCartUi`); nhánh hộp thoại đóng hộp thoại trước rồi mới mở ngăn kéo.
 * `keepFocusOnClose`: hộp thoại thêm xong thì đóng nhưng KHÔNG trả focus về nút thẻ, vì ngăn kéo giỏ vừa mở đã nhận focus.
 */
export function useQuickAdd(slug: string) {
  const { requireLogin, addToCart, openCart, adding } = useCartUi()
  const fetchProduct = useFetchCatalogProduct()
  const toast = useToast()
  const [loading, setLoading] = useState(false)
  const [detail, setDetail] = useState<CatalogProductDetail | null>(null)
  const [open, setOpen] = useState(false)
  const added = useRef(false)
  const openCartAfterClose = useRef(false)

  const run = async () => {
    setLoading(true)
    try {
      const product = await fetchProduct(slug)
      if (product.variants.length === 1) {
        const [only] = product.variants
        if (only.inStock) await addToCart({ variantId: only.id, quantity: 1 })
        else toast.add({ title: "Sản phẩm đã hết hàng", data: { tone: "danger" } })
      } else {
        added.current = false
        setDetail(product)
        setOpen(true)
      }
    } catch (error) {
      toast.add({ title: `${ApiError.from(error).message} Hãy thử lại.`, data: { tone: "danger" } })
    } finally {
      setLoading(false)
    }
  }

  const addFromDialog = async (input: { variantId: number; quantity: number }) => {
    // Không mở ngăn kéo ngay: đóng hộp thoại xong (`onOpenChangeComplete`) mới trượt ngăn kéo vào, để hai lớp nền không chồng nhau.
    if (await addToCart(input, { openCart: false })) {
      added.current = true
      openCartAfterClose.current = true
      setOpen(false)
    }
  }

  const onOpenChangeComplete = (isOpen: boolean) => {
    if (isOpen || !openCartAfterClose.current) return
    openCartAfterClose.current = false
    openCart()
  }

  return {
    start: () => requireLogin(() => void run()),
    loading,
    dialog: { product: detail, open, onOpenChange: setOpen, pending: adding, onAdd: addFromDialog, onOpenChangeComplete, finalFocus: () => !added.current },
  }
}
