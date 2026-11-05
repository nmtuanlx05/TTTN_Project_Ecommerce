import { keepPreviousData, useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import type { ApiError } from "@/lib/api-error"
import { getAvailableVouchers, getDistricts, getProvinces, getWards, placeOrder, previewOrder } from "./api"
import type { AvailableVoucher, LocationItem, OrderPreview, PlaceOrderInput, PlacedOrder } from "./types"

const previewKey = (code: string | null) => ["checkout", "preview", code] as const

/** Xem trước đủ mới trong khoảng này thì không gọi lại (kết quả "Áp dụng" được ghi thẳng vào cache nên đổi voucher không gọi hai lần). */
const PREVIEW_STALE_TIME = 15_000
/** Địa chỉ hành chính gần như không đổi (backend cũng cho cache 1 ngày). */
const LOCATION_STALE_TIME = Infinity

/** Xem trước đơn theo mã đang áp dụng (`null` = không voucher). Giữ kết quả cũ trong lúc đổi mã để khỏi nháy khung chờ. */
export function usePreview(appliedCode: string | null) {
  return useQuery<OrderPreview, ApiError>({
    queryKey: previewKey(appliedCode),
    queryFn: () => previewOrder(appliedCode ?? undefined),
    staleTime: PREVIEW_STALE_TIME,
    retry: false,
    placeholderData: keepPreviousData,
  })
}

/** "Áp dụng" mã: thử xem trước với mã đó; thành công thì ghi vào cache dưới đúng mã backend trả (đã chuẩn hóa hoa) và trả mã đó. */
export function useApplyVoucher() {
  const queryClient = useQueryClient()
  return useMutation<string, ApiError, string>({
    mutationFn: async (code) => {
      const preview = await previewOrder(code)
      const canonical = preview.voucher?.code ?? code
      queryClient.setQueryData(previewKey(canonical), preview)
      return canonical
    },
  })
}

export function usePlaceOrder() {
  return useMutation<PlacedOrder, ApiError, { input: PlaceOrderInput; idempotencyKey: string }>({
    mutationFn: ({ input, idempotencyKey }) => placeOrder(input, idempotencyKey),
  })
}

/** Voucher còn dùng được cho khách (tối đa 20). Lỗi hay rỗng đều không chặn đặt đơn. */
export function useAvailableVouchers() {
  return useQuery<AvailableVoucher[], ApiError>({
    queryKey: ["checkout", "vouchers"],
    queryFn: ({ signal }) => getAvailableVouchers(signal),
    staleTime: 60_000,
    retry: false,
  })
}

export function useProvinces() {
  return useQuery<LocationItem[], ApiError>({
    queryKey: ["locations", "provinces"],
    queryFn: ({ signal }) => getProvinces(signal),
    staleTime: LOCATION_STALE_TIME,
    gcTime: Infinity,
  })
}

export function useDistricts(provinceCode: string) {
  return useQuery<LocationItem[], ApiError>({
    queryKey: ["locations", "districts", provinceCode],
    queryFn: ({ signal }) => getDistricts(provinceCode, signal),
    enabled: provinceCode !== "",
    staleTime: LOCATION_STALE_TIME,
    gcTime: Infinity,
  })
}

/** Mảng rỗng (HTTP 200) nghĩa là quận/huyện không có phường/xã. */
export function useWards(districtCode: string) {
  return useQuery<LocationItem[], ApiError>({
    queryKey: ["locations", "wards", districtCode],
    queryFn: ({ signal }) => getWards(districtCode, signal),
    enabled: districtCode !== "",
    staleTime: LOCATION_STALE_TIME,
    gcTime: Infinity,
  })
}
