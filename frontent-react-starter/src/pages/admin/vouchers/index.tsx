import { Plus } from "lucide-react"
import { PageHeader } from "@/components/admin/page-header"
import { Button } from "@/components/ui/button"
import { VoucherFormDialog } from "@/features/admin-vouchers/components/voucher-form-dialog"
import { VoucherStatusDialog } from "@/features/admin-vouchers/components/voucher-status-dialog"
import { VouchersContent } from "@/features/admin-vouchers/components/vouchers-content"
import { VouchersToolbar } from "@/features/admin-vouchers/components/vouchers-toolbar"
import type { Voucher } from "@/features/admin-vouchers/types"
import { useVoucherStatusAction } from "@/features/admin-vouchers/use-voucher-status-action"
import { useVouchersSearchParams } from "@/features/admin-vouchers/use-vouchers-search-params"
import { useDialogTarget } from "@/hooks/use-dialog-target"

function VouchersPage() {
  const search = useVouchersSearchParams()
  const form = useDialogTarget<Voucher>()
  const status = useVoucherStatusAction()

  return (
    <div className="flex flex-col gap-section">
      <PageHeader
        title="Voucher"
        description="Tạo và quản lý mã giảm giá cho đơn hàng."
        actions={
          <Button className="cursor-pointer" onClick={() => form.show(null)}>
            <Plus />
            Thêm voucher
          </Button>
        }
      />

      <div className="flex flex-col gap-stack">
        <VouchersToolbar
          q={search.q}
          status={search.status}
          hasFilters={search.hasFilters}
          onSearch={search.setQuery}
          onStatusChange={search.setStatus}
          onClear={search.clearFilters}
        />
        <VouchersContent
          search={search}
          togglingId={status.togglingId}
          onEdit={form.show}
          onToggle={status.request}
        />
      </div>

      <VoucherFormDialog {...form.dialogProps} voucher={form.target} />
      <VoucherStatusDialog {...status.dialogProps} />
    </div>
  )
}

export default VouchersPage
