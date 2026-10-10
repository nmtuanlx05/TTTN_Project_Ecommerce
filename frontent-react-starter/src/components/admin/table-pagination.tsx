import { ChevronLeft, ChevronRight } from "lucide-react"
import { Button } from "@/components/ui/button"
import { formatNumber } from "@/lib/format"
import type { PaginationMeta } from "@/types/api"

/**
 * Phân trang phía server cho bảng quản trị. Số trang và tổng lấy từ `meta` của
 * backend, không tự tính lại. Dòng tóm tắt là vùng live để người dùng đọc màn
 * hình biết kết quả đã đổi sau khi lọc hoặc chuyển trang.
 */
function TablePagination({
  meta,
  itemCount,
  noun,
  onPageChange,
  disabled,
}: {
  meta: PaginationMeta
  /** Số dòng đang hiển thị ở trang này. */
  itemCount: number
  /** Danh từ đếm: "người dùng", "đơn hàng"… */
  noun: string
  onPageChange: (page: number) => void
  disabled?: boolean
}) {
  const { page, limit, total, totalPages } = meta
  const from = itemCount === 0 ? 0 : (page - 1) * limit + 1
  const to = (page - 1) * limit + itemCount

  return (
    <div className="flex flex-col gap-inline sm:flex-row sm:items-center sm:justify-between">
      <p aria-live="polite" className="text-body-sm text-ink-muted">
        Hiển thị <span data-numeric>{formatNumber(from)}–{formatNumber(to)}</span> trên{" "}
        <span data-numeric>{formatNumber(total)}</span> {noun}
      </p>

      <nav aria-label="Phân trang" className="flex items-center gap-inline">
        <Button
          variant="secondary"
          size="sm"
          disabled={disabled || page <= 1}
          onClick={() => onPageChange(page - 1)}
        >
          <ChevronLeft />
          Trước
        </Button>
        <span className="text-body-sm text-ink-muted" data-numeric>
          Trang {page} / {Math.max(totalPages, 1)}
        </span>
        <Button
          variant="secondary"
          size="sm"
          disabled={disabled || page >= totalPages}
          onClick={() => onPageChange(page + 1)}
        >
          Sau
          <ChevronRight />
        </Button>
      </nav>
    </div>
  )
}

export { TablePagination }
