import { useCallback, useRef, useState } from "react"
import { useMutation, useQueryClient } from "@tanstack/react-query"
import { useToast } from "@/components/ui/toast"
import { ApiError } from "@/lib/api-error"
import { addWishlistItem, removeWishlistItem } from "./api"
import { removeCard, restoreCard, withId, withoutId, type RemovedCard, type WishlistListData } from "./cache-updates"
import { WISHLIST_FULL_CODE, WISHLIST_MESSAGES } from "./constants"
import { useWishlistIds, wishlistKeys } from "./queries"

interface ToggleVariables {
  productId: number
  /** Trạng thái muốn đạt: true = thêm, false = bỏ (API idempotent nên gửi lại an toàn). */
  add: boolean
}
interface ToggleContext {
  removed?: RemovedCard
}

function failureMessage(error: ApiError): string {
  if (error.code === WISHLIST_FULL_CODE) return WISHLIST_MESSAGES.full
  if (error.statusCode === 404) return WISHLIST_MESSAGES.notFound
  if (error.isNetworkError) return WISHLIST_MESSAGES.failed
  return error.message || WISHLIST_MESSAGES.failed
}

/**
 * Ids yêu thích + bật/tắt một sản phẩm. Cập nhật LẠC QUAN: `ids` đổi ngay; bỏ thì thẻ biến khỏi danh sách ngay (lỗi thì đặt lại đúng chỗ cũ), thêm thì danh sách làm mới sau khi xong
 * (chưa có dữ liệu thẻ để chèn). Khóa theo TỪNG sản phẩm (`isPending`, bấm khi đang chờ bị bỏ qua) nên không gọi chồng nhưng hai sản phẩm khác nhau chạy song song; hoàn lại
 * theo thao tác ngược của đúng sản phẩm đó, không khôi phục cả cache (tránh đè thay đổi của sản phẩm khác). Làm mới theo khóa cha khi không còn thao tác nào đang chờ.
 * Danh sách ids chưa tải xong thì `isPending` là true cho MỌI sản phẩm và `toggle` bị bỏ qua (xem `idsLoading`).
 * Lỗi: 409 `WISHLIST_FULL`, 404 (làm mới ids) và các lỗi khác đều toast; không bao giờ để lỗi thô lọt ra.
 * `enabled`: chỉ CUSTOMER đã đăng nhập (do routes truyền); cổng đăng nhập nằm ở nơi gọi.
 */
export function useToggleWishlist({ enabled }: { enabled: boolean }) {
  const queryClient = useQueryClient()
  const toast = useToast()
  const idsQuery = useWishlistIds({ enabled })
  const ids = idsQuery.data ?? []
  // Chưa biết sản phẩm nào đã yêu thích thì khóa mọi tim (tránh gửi "thêm" cho sản phẩm thực ra đã có, khiến người dùng không bỏ được). Lỗi tải ids thì KHÔNG khóa: `isPending` của
  // TanStack chỉ đúng khi chưa có dữ liệu VÀ chưa lỗi; khi đó tim hiện rỗng, bấm là "thêm" (API idempotent, lần làm mới sau khi xong sẽ đồng bộ lại ids).
  const idsLoading = enabled && idsQuery.isPending
  const pendingRef = useRef(new Set<number>())
  const [pending, setPending] = useState<ReadonlySet<number>>(new Set())

  const syncPending = () => setPending(new Set(pendingRef.current))

  const mutation = useMutation<unknown, ApiError, ToggleVariables, ToggleContext>({
    mutationFn: ({ productId, add }) => (add ? addWishlistItem(productId) : removeWishlistItem(productId)),
    onMutate: async ({ productId, add }) => {
      await queryClient.cancelQueries({ queryKey: wishlistKeys.all })
      queryClient.setQueryData<number[]>(wishlistKeys.ids, (old = []) =>
        add ? withId(old, productId) : withoutId(old, productId),
      )
      if (add) return {}
      let removed: RemovedCard | undefined
      queryClient.setQueryData<WishlistListData>(wishlistKeys.list, (old) => {
        if (!old) return old
        const result = removeCard(old, productId)
        removed = result.removed
        return result.data
      })
      return { removed }
    },
    onError: (error, { productId, add }, context) => {
      queryClient.setQueryData<number[]>(wishlistKeys.ids, (old = []) =>
        add ? withoutId(old, productId) : withId(old, productId),
      )
      const removed = context?.removed
      if (removed) {
        queryClient.setQueryData<WishlistListData>(wishlistKeys.list, (old) => (old ? restoreCard(old, removed) : old))
      }
      toast.add({ title: failureMessage(error), data: { tone: "danger" } })
    },
    onSettled: (_data, error, { productId }) => {
      pendingRef.current.delete(productId)
      syncPending()
      // 404: ids vừa hoàn lại có thể vẫn lệch (sản phẩm không còn); chỉ làm mới khi không còn thao tác nào đang chờ.
      if (pendingRef.current.size === 0 || error?.statusCode === 404) {
        void queryClient.invalidateQueries({ queryKey: wishlistKeys.all })
      }
    },
  })

  const toggle = useCallback(
    (productId: number) => {
      if (idsLoading || pendingRef.current.has(productId)) return
      const current = queryClient.getQueryData<number[]>(wishlistKeys.ids) ?? []
      pendingRef.current.add(productId)
      syncPending()
      mutation.mutate({ productId, add: !current.includes(productId) })
    },
    // `mutation.mutate` ổn định; `syncPending` chỉ dùng ref và setState.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [queryClient, mutation.mutate, idsLoading],
  )

  return {
    ids,
    isFavorite: (productId: number) => ids.includes(productId),
    isPending: (productId: number) => idsLoading || pending.has(productId),
    toggle,
  }
}
