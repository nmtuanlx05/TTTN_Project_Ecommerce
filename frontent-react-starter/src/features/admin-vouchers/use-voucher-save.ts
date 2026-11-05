import { useQueryClient } from "@tanstack/react-query"
import type { UseFormSetError } from "react-hook-form"
import { useToast } from "@/components/ui/toast"
import type { ApiError } from "@/lib/api-error"
import { buildCreateInput, buildUpdateInput } from "./form-mapping"
import { useCreateVoucher, useUpdateVoucher, voucherKeys } from "./queries"
import type { VoucherFormValues } from "./schemas"
import type { Voucher } from "./types"
import { mapVoucherError } from "./voucher-errors"

/**
 * Lưu form voucher: tạo (`voucher === null`) hoặc sửa. Hai mutation nằm ở đây, không nằm trong form,
 * vì hộp thoại cần biết `busy` để khóa việc đóng. Thành công thì toast và đóng; lỗi thì gắn vào ô hoặc toast, hộp vẫn mở.
 */
export function useVoucherSave(voucher: Voucher | null, onClose: () => void) {
  const createMutation = useCreateVoucher()
  const updateMutation = useUpdateVoucher()
  const queryClient = useQueryClient()
  const toast = useToast()
  const mode = voucher ? "edit" : "create"

  function handleError(error: ApiError, setError: UseFormSetError<VoucherFormValues>) {
    const mapped = mapVoucherError(error, mode)
    let focused = false
    for (const [field, message] of Object.entries(mapped.fields)) {
      setError(field as keyof VoucherFormValues, { message }, { shouldFocus: !focused })
      focused = true
    }
    if (mapped.toast) toast.add({ ...mapped.toast, data: { tone: "danger" } })
    if (mapped.refresh) void queryClient.invalidateQueries({ queryKey: voucherKeys.all })
    if (mapped.close) onClose()
  }

  function submit(
    values: VoucherFormValues,
    setError: UseFormSetError<VoucherFormValues>,
    locked: boolean,
  ) {
    if (voucher) {
      const input = buildUpdateInput(voucher, values, locked)
      if (Object.keys(input).length === 0) {
        onClose()
        return
      }
      updateMutation.mutate(
        { id: voucher.id, input },
        {
          onSuccess: (saved) => {
            toast.add({ title: "Đã lưu thay đổi", description: saved.code, data: { tone: "success" } })
            onClose()
          },
          onError: (error) => handleError(error, setError),
        },
      )
      return
    }
    createMutation.mutate(buildCreateInput(values), {
      onSuccess: (created) => {
        toast.add({ title: "Đã tạo voucher", description: created.code, data: { tone: "success" } })
        onClose()
      },
      onError: (error) => handleError(error, setError),
    })
  }

  return { submit, busy: createMutation.isPending || updateMutation.isPending }
}
