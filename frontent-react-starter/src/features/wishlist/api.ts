import { apiGet, apiGetPage, apiSend } from "@/lib/api-client"
import type { Paginated } from "@/types/api"
import type { WishlistAddResult, WishlistItem, WishlistRemoveResult } from "./types"

/** Gọi API wishlist (docs/api/wishlist.md, chỉ CUSTOMER). Chỉ `queries.ts` và `use-toggle-wishlist.ts` được import file này. */

export function getWishlist(page: number, limit: number, signal?: AbortSignal): Promise<Paginated<WishlistItem>> {
  return apiGetPage<WishlistItem>("/wishlist", { params: { page, limit }, signal })
}

export function getWishlistIds(signal?: AbortSignal): Promise<number[]> {
  return apiGet<number[]>("/wishlist/ids", { signal })
}

export function addWishlistItem(productId: number): Promise<WishlistAddResult> {
  return apiSend<WishlistAddResult>("post", `/wishlist/${productId}`)
}

export function removeWishlistItem(productId: number): Promise<WishlistRemoveResult> {
  return apiSend<WishlistRemoveResult>("delete", `/wishlist/${productId}`)
}
