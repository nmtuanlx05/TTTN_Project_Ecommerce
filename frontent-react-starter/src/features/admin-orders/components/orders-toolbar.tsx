import { X } from "lucide-react"
import { SearchInput } from "@/components/admin/search-input"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import type { AdminOrdersSearch } from "../use-admin-orders-search-params"

/** Thanh công cụ: tìm theo mã đơn / số điện thoại / tên và khoảng ngày đặt (hai ô ngày gốc; backend hiểu theo GMT+7). */
function OrdersToolbar({ search }: { search: AdminOrdersSearch }) {
  return (
    <div className="flex flex-col gap-inline md:flex-row md:flex-wrap md:items-end">
      <SearchInput
        value={search.q}
        onSearch={search.setQuery}
        placeholder="Tìm theo mã đơn, số điện thoại hoặc tên"
        label="Tìm đơn hàng"
      />
      <div className="flex flex-wrap items-end gap-inline">
        <div className="flex flex-col gap-1">
          <Label htmlFor="orders-from" className="text-caption text-ink-muted">
            Từ ngày
          </Label>
          <Input
            id="orders-from"
            type="date"
            className="w-40"
            max={search.to}
            value={search.from ?? ""}
            onChange={(event) => search.setFrom(event.target.value)}
          />
        </div>
        <div className="flex flex-col gap-1">
          <Label htmlFor="orders-to" className="text-caption text-ink-muted">
            Đến ngày
          </Label>
          <Input
            id="orders-to"
            type="date"
            className="w-40"
            min={search.from}
            value={search.to ?? ""}
            onChange={(event) => search.setTo(event.target.value)}
          />
        </div>
        {search.hasFilters ? (
          <Button variant="ghost" onClick={search.clearFilters}>
            <X />
            Xóa bộ lọc
          </Button>
        ) : null}
      </div>
    </div>
  )
}

export { OrdersToolbar }
