import { keepPreviousData, useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import type { ApiError } from "@/lib/api-error"
import {
  createVoucher,
  getVoucher,
  listVouchers,
  setVoucherStatus,
  updateVoucher,
} from "./api"
import type {
  CreateVoucherInput,
  UpdateVoucherInput,
  Voucher,
  VoucherListParams,
} from "./types"

export const voucherKeys = {
  /** Tiền tố chung: làm mới mọi danh sách và chi tiết voucher. */
  all: ["admin-vouchers"] as const,
  list: (params: VoucherListParams) => ["admin-vouchers", "list", params] as const,
  detail: (id: number) => ["admin-vouchers", "detail", id] as const,
}

/** Danh sách voucher. Giữ dữ liệu trang cũ trong lúc tải trang mới để bảng không giật. */
export function useVouchers(params: VoucherListParams) {
  return useQuery({
    queryKey: voucherKeys.list(params),
    queryFn: ({ signal }) => listVouchers(params, signal),
    placeholderData: keepPreviousData,
  })
}

/** Chi tiết kèm thống kê. Luôn tải lại khi mở form sửa để `usedCount` (quyết định ô nào bị khóa) không cũ. */
export function useVoucher(id: number) {
  return useQuery({
    queryKey: voucherKeys.detail(id),
    queryFn: ({ signal }) => getVoucher(id, signal),
    staleTime: 0,
    refetchOnMount: "always",
  })
}

export function useCreateVoucher() {
  const queryClient = useQueryClient()
  return useMutation<Voucher, ApiError, CreateVoucherInput>({
    mutationFn: createVoucher,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: voucherKeys.all }),
  })
}

export function useUpdateVoucher() {
  const queryClient = useQueryClient()
  return useMutation<Voucher, ApiError, { id: number; input: UpdateVoucherInput }>({
    mutationFn: ({ id, input }) => updateVoucher(id, input),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: voucherKeys.all }),
  })
}

/** Bật / tắt (voucher không bao giờ xóa cứng). Làm mới cả khi lỗi để bỏ dữ liệu cũ (vd. 404). */
export function useToggleVoucherStatus() {
  const queryClient = useQueryClient()
  return useMutation<Voucher, ApiError, { id: number; isActive: boolean }>({
    mutationFn: ({ id, isActive }) => setVoucherStatus(id, isActive),
    onSettled: () => queryClient.invalidateQueries({ queryKey: voucherKeys.all }),
  })
}
