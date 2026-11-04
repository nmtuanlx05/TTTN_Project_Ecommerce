import { useCallback } from "react"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { useToast } from "@/components/ui/toast"
import type { ApiError } from "@/lib/api-error"
import { addCartItem, clearCart, getCart, removeCartItem, updateCartItem } from "./api"
import type { AddToCartInput, Cart } from "./types"

export const cartKeys = {
  all: ["cart"] as const,
}

/** Giỏ còn mới trong khoảng này thì chuyển trang không gọi lại; mở ngăn kéo vẫn làm mới nền (`useRefreshCartOnOpen`). */
const CART_STALE_TIME = 45_000

/**
 * Giỏ của khách. `enabled` do nơi gọi truyền vào (chỉ CUSTOMER đã đăng nhập): `features/cart` không đọc phiên từ `features/auth`.
 * Không thử lại khi lỗi để huy hiệu ở header chỉ đơn giản ẩn đi (ngăn kéo hiện nút "Thử lại").
 */
export function useCart({ enabled }: { enabled: boolean }) {
  return useQuery<Cart, ApiError>({
    queryKey: cartKeys.all,
    queryFn: ({ signal }) => getCart(signal),
    enabled,
    staleTime: CART_STALE_TIME,
    retry: false,
  })
}

/** Giỏ vừa được ghi (mutation trả giỏ mới) trong khoảng này thì không làm mới lại khi mở ngăn kéo: dữ liệu đã mới nhất, khỏi một GET thừa và khỏi đổi nội dung giữa lúc ngăn kéo đang trượt. */
const JUST_WRITTEN_MS = 3_000

/** Làm mới giỏ nền (có dữ liệu cache thì vẫn hiện, không khung chờ); cờ `purchasable`/`inStock`/`maxQuantity` luôn mới khi mở giỏ. */
export function useRefreshCart() {
  const queryClient = useQueryClient()
  return useCallback(() => {
    const updatedAt = queryClient.getQueryState(cartKeys.all)?.dataUpdatedAt ?? 0
    if (Date.now() - updatedAt < JUST_WRITTEN_MS) return
    void queryClient.invalidateQueries({ queryKey: cartKeys.all })
  }, [queryClient])
}

/**
 * Chung cho mọi thao tác ghi: giỏ trả về ghi thẳng vào cache (huy hiệu và danh sách tự cập nhật, không gọi thêm GET);
 * lỗi hiện đúng message của backend (409: hết hàng, vượt 10, vượt hàng còn...) rồi làm mới giỏ vì tồn kho có thể đã đổi.
 */
function useCartMutation<TVariables>(mutationFn: (variables: TVariables) => Promise<Cart>) {
  const queryClient = useQueryClient()
  const toast = useToast()
  return useMutation<Cart, ApiError, TVariables>({
    mutationFn,
    onSuccess: (cart) => queryClient.setQueryData(cartKeys.all, cart),
    onError: (error) => {
      toast.add({ title: error.message, data: { tone: "danger" } })
      void queryClient.invalidateQueries({ queryKey: cartKeys.all })
    },
  })
}

export function useAddToCart() {
  return useCartMutation<AddToCartInput>(addCartItem)
}

export function useUpdateCartItem() {
  return useCartMutation<{ id: number; quantity: number }>(({ id, quantity }) => updateCartItem(id, quantity))
}

export function useRemoveCartItem() {
  return useCartMutation<number>(removeCartItem)
}

export function useClearCart() {
  return useCartMutation<void>(clearCart)
}
