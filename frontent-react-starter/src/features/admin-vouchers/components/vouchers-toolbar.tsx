import { X } from "lucide-react"
import { SearchInput } from "@/components/admin/search-input"
import { Button } from "@/components/ui/button"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { STATUS_LABEL, STATUSES } from "../constants"
import type { VoucherStatus } from "../types"

const ALL = "all"

const STATUS_ITEMS = [
  { value: ALL, label: "Tất cả trạng thái" },
  ...STATUSES.map((status) => ({ value: status, label: STATUS_LABEL[status] })),
]

function VouchersToolbar({
  q,
  status,
  hasFilters,
  onSearch,
  onStatusChange,
  onClear,
}: {
  q: string
  status: VoucherStatus | undefined
  hasFilters: boolean
  onSearch: (value: string) => void
  onStatusChange: (status: VoucherStatus | undefined) => void
  onClear: () => void
}) {
  return (
    <div className="flex flex-col gap-inline md:flex-row md:items-center">
      <SearchInput
        value={q}
        onSearch={onSearch}
        placeholder="Tìm theo mã voucher"
        label="Tìm voucher theo mã"
      />

      <div className="flex flex-col gap-inline sm:flex-row sm:items-center">
        <Select
          items={STATUS_ITEMS}
          value={status ?? ALL}
          onValueChange={(next) => onStatusChange(next === ALL ? undefined : (next as VoucherStatus))}
        >
          <SelectTrigger aria-label="Lọc theo trạng thái" className="sm:w-48">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {STATUS_ITEMS.map((item) => (
              <SelectItem key={item.value} value={item.value}>
                {item.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {hasFilters ? (
          <Button variant="ghost" onClick={onClear}>
            <X />
            Xóa bộ lọc
          </Button>
        ) : null}
      </div>
    </div>
  )
}

export { VouchersToolbar }
