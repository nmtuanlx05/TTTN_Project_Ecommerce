import { RotateCw } from "lucide-react"
import type { UseFormSetError } from "react-hook-form"
import { FormDialogBody, FormDialogFooter } from "@/components/shared/form-dialog"
import { Alert } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { useVoucher } from "../queries"
import type { VoucherFormValues } from "../schemas"
import type { Voucher } from "../types"
import { VoucherForm } from "./voucher-form"

/** Tải chi tiết (kèm thống kê) rồi mới dựng form sửa: skeleton lúc chờ, lỗi có nút thử lại. */
function VoucherEditLoader({
  voucher,
  busy,
  onCancel,
  onSubmit,
}: {
  voucher: Voucher
  busy: boolean
  onCancel: () => void
  onSubmit: (
    values: VoucherFormValues,
    setError: UseFormSetError<VoucherFormValues>,
    locked: boolean,
  ) => void
}) {
  const { data, error, isPending, isError, isFetching, refetch } = useVoucher(voucher.id)

  if (data) return <VoucherForm detail={data} busy={busy} onCancel={onCancel} onSubmit={onSubmit} />

  return (
    <>
      <FormDialogBody>
        {isError ? (
          <Alert variant="danger" title="Không tải được voucher">
            <p>{error.message}</p>
            <Button variant="secondary" size="sm" className="mt-2" loading={isFetching} onClick={() => refetch()}>
              <RotateCw />
              Thử lại
            </Button>
          </Alert>
        ) : (
          <div aria-busy={isPending} className="flex flex-col gap-stack">
            {Array.from({ length: 5 }, (_, index) => (
              <Skeleton key={index} className="h-10 w-full" />
            ))}
          </div>
        )}
      </FormDialogBody>
      <FormDialogFooter>
        <Button className="cursor-pointer" type="button" variant="secondary" onClick={onCancel}>
          Đóng
        </Button>
      </FormDialogFooter>
    </>
  )
}

export { VoucherEditLoader }
