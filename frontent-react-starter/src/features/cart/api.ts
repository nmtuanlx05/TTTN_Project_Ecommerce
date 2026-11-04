import { apiGet, apiSend } from "@/lib/api-client"
import type { AddToCartInput, Cart } from "./types"

/** Gọi API giỏ hàng (docs/api/cart.md, chỉ CUSTOMER). Chỉ `queries.ts` được import file này. */

export function getCart(signal?: AbortSignal): Promise<Cart> {
  return apiGet<Cart>("/cart", { signal })
}

export function addCartItem(input: AddToCartInput): Promise<Cart> {
  return apiSend<Cart>("post", "/cart/items", input)
}

export function updateCartItem(id: number, quantity: number): Promise<Cart> {
  return apiSend<Cart>("patch", `/cart/items/${id}`, { quantity })
}

export function removeCartItem(id: number): Promise<Cart> {
  return apiSend<Cart>("delete", `/cart/items/${id}`)
}

export function clearCart(): Promise<Cart> {
  return apiSend<Cart>("delete", "/cart")
}
