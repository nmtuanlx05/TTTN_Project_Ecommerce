import { apiGet, apiGetPage, apiSend } from "@/lib/api-client"
import type { Paginated } from "@/types/api"
import type {
  CreateVoucherInput,
  UpdateVoucherInput,
  Voucher,
  VoucherDetail,
  VoucherListParams,
} from "./types"

/** Gọi API /admin/vouchers (docs/api/vouchers.md). Chỉ `queries.ts` được import file này. */

export function listVouchers(
  params: VoucherListParams,
  signal?: AbortSignal,
): Promise<Paginated<Voucher>> {
  return apiGetPage<Voucher>("/admin/vouchers", { params, signal })
}

export function getVoucher(id: number, signal?: AbortSignal): Promise<VoucherDetail> {
  return apiGet<VoucherDetail>(`/admin/vouchers/${id}`, { signal })
}

export function createVoucher(input: CreateVoucherInput): Promise<Voucher> {
  return apiSend<Voucher>("post", "/admin/vouchers", input)
}

export function updateVoucher(id: number, input: UpdateVoucherInput): Promise<Voucher> {
  return apiSend<Voucher>("patch", `/admin/vouchers/${id}`, input)
}

export function setVoucherStatus(id: number, isActive: boolean): Promise<Voucher> {
  return apiSend<Voucher>("patch", `/admin/vouchers/${id}/status`, { isActive })
}
