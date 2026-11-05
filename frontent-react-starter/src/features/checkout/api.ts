import { apiGet, apiSend } from "@/lib/api-client"
import type { AvailableVoucher, LocationItem, OrderPreview, PlaceOrderInput, PlacedOrder } from "./types"

/** Gọi API xem trước/đặt đơn/voucher/địa chỉ. Chỉ `queries.ts` được import file này. */

export function previewOrder(voucherCode?: string): Promise<OrderPreview> {
  return apiSend<OrderPreview>("post", "/orders/preview", voucherCode ? { voucherCode } : {})
}

export function placeOrder(input: PlaceOrderInput, idempotencyKey: string): Promise<PlacedOrder> {
  return apiSend<PlacedOrder>("post", "/orders", input, { headers: { "Idempotency-Key": idempotencyKey } })
}

export function getAvailableVouchers(signal?: AbortSignal): Promise<AvailableVoucher[]> {
  return apiGet<AvailableVoucher[]>("/vouchers/available", { signal })
}

// Địa chỉ 3 cấp (chuẩn cũ). Tách khỏi checkout khi V2 có sổ địa chỉ của tài khoản.
export function getProvinces(signal?: AbortSignal): Promise<LocationItem[]> {
  return apiGet<LocationItem[]>("/locations/provinces", { signal })
}

export function getDistricts(provinceCode: string, signal?: AbortSignal): Promise<LocationItem[]> {
  return apiGet<LocationItem[]>(`/locations/provinces/${encodeURIComponent(provinceCode)}/districts`, { signal })
}

export function getWards(districtCode: string, signal?: AbortSignal): Promise<LocationItem[]> {
  return apiGet<LocationItem[]>(`/locations/districts/${encodeURIComponent(districtCode)}/wards`, { signal })
}
