import { rowSortingFeature, tableFeatures, type ColumnDef } from "@tanstack/react-table"
import { Pencil } from "lucide-react"
import { Button } from "@/components/ui/button"
import { formatVnd } from "@/lib/format"
import type { Voucher } from "../types"
import { discountText, periodText } from "../voucher-text"
import { VoucherActiveSwitch } from "./voucher-active-switch"
import { VoucherStatusBadge } from "./voucher-status-badge"
import { VoucherUsageCell } from "./voucher-usage-cell"

// Sắp xếp và phân trang do backend làm, bảng chỉ hiển thị; rowSortingFeature chỉ để biết cột nào đang sắp (aria-sort).
export const voucherTableFeatures = tableFeatures({ rowSortingFeature })
export type VoucherTableFeatures = typeof voucherTableFeatures

/** Id cột `code`, `startsAt`, `usedCount` trùng tên trường `sortBy` của backend. */
export function buildVoucherColumns({
  togglingId,
  onEdit,
  onToggle,
}: {
  togglingId: number | undefined
  onEdit: (voucher: Voucher) => void
  onToggle: (voucher: Voucher, isActive: boolean) => void
}): ColumnDef<VoucherTableFeatures, Voucher>[] {
  return [
    {
      id: "code",
      header: "Mã",
      cell: ({ row }) => (
        <div className="flex max-w-56 flex-col gap-0.5">
          <span className="font-mono font-semibold whitespace-nowrap text-ink">{row.original.code}</span>
          {row.original.description ? (
            <span className="truncate text-caption text-ink-muted" title={row.original.description}>
              {row.original.description}
            </span>
          ) : null}
        </div>
      ),
    },
    {
      id: "discount",
      header: "Ưu đãi",
      enableSorting: false,
      cell: ({ row }) => <span className="whitespace-nowrap">{discountText(row.original)}</span>,
    },
    {
      id: "minOrderValue",
      header: "Đơn tối thiểu",
      enableSorting: false,
      cell: ({ row }) =>
        row.original.minOrderValue > 0 ? (
          <span data-numeric className="whitespace-nowrap">
            {formatVnd(row.original.minOrderValue)}
          </span>
        ) : (
          <span className="text-ink-muted">—</span>
        ),
    },
    {
      id: "startsAt",
      header: "Thời gian áp dụng",
      cell: ({ row }) => (
        <span data-numeric className="whitespace-nowrap">
          {periodText(row.original)}
        </span>
      ),
    },
    { id: "usedCount", header: "Lượt dùng", cell: ({ row }) => <VoucherUsageCell voucher={row.original} /> },
    {
      id: "status",
      header: "Trạng thái",
      enableSorting: false,
      cell: ({ row }) => <VoucherStatusBadge status={row.original.status} />,
    },
    {
      id: "isActive",
      header: "Bật/tắt",
      enableSorting: false,
      cell: ({ row }) => (
        <VoucherActiveSwitch
          voucher={row.original}
          disabled={togglingId !== undefined}
          onToggle={onToggle}
        />
      ),
    },
    {
      id: "actions",
      header: () => <span className="sr-only">Hành động</span>,
      enableSorting: false,
      cell: ({ row }) => (
        <div className="flex justify-end">
          <Button
            variant="ghost"
            size="icon-sm"
            aria-label={`Sửa voucher ${row.original.code}`}
            title="Sửa voucher"
            onClick={() => onEdit(row.original)}
          >
            <Pencil />
          </Button>
        </div>
      ),
    },
  ]
}
