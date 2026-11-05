import { useInfiniteQuery, useQuery } from "@tanstack/react-query"
import type { ApiError } from "@/lib/api-error"
import { getWishlist, getWishlistIds } from "./api"
import { WISHLIST_PAGE_SIZE } from "./constants"

export const wishlistKeys = {
  all: ["wishlist"] as const,
  ids: ["wishlist", "ids"] as const,
  list: ["wishlist", "list"] as const,
}

/**
 * Mảng productId đang yêu thích (tối đa 100, gồm cả sản phẩm đã tắt): nguồn DUY NHẤT cho tim đã chọn, huy hiệu header và số ở tiêu đề ngăn kéo.
 * `enabled` do nơi gọi truyền vào (chỉ CUSTOMER đã đăng nhập): `features/wishlist` không đọc phiên từ `features/auth`. Lỗi thì không thử lại, tim chỉ hiện rỗng.
 */
export function useWishlistIds({ enabled }: { enabled: boolean }) {
  return useQuery<number[], ApiError>({
    queryKey: wishlistKeys.ids,
    queryFn: ({ signal }) => getWishlistIds(signal),
    enabled,
    retry: false,
  })
}

/** Danh sách cho ngăn kéo, tải thêm theo trang; `enabled` = ngăn kéo đang mở. */
export function useWishlist({ enabled }: { enabled: boolean }) {
  return useInfiniteQuery({
    queryKey: wishlistKeys.list,
    queryFn: ({ pageParam, signal }) => getWishlist(pageParam, WISHLIST_PAGE_SIZE, signal),
    initialPageParam: 1,
    getNextPageParam: (last) => (last.meta.page < last.meta.totalPages ? last.meta.page + 1 : undefined),
    enabled,
  })
}
