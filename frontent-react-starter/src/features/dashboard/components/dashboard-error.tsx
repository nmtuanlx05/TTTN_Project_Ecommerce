import { Alert } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import type { ApiError } from "@/lib/api-error"

/** Thông điệp riêng cho từng mã lỗi của `GET /admin/dashboard` (backend dashboard.constants.ts). */
function describe(error: ApiError): { title: string; message: string; retry: boolean } {
  if (error.statusCode === 403) {
    return { title: "Không có quyền", message: "Bạn không có quyền xem trang này.", retry: false }
  }
  switch (error.code) {
    case "INVALID_DATE_RANGE":
      return { title: "Khoảng ngày không hợp lệ", message: "Ngày bắt đầu phải trước hoặc bằng ngày kết thúc.", retry: false }
    case "DATE_RANGE_TOO_LONG":
      return { title: "Khoảng ngày quá dài", message: "Chỉ xem được tối đa 366 ngày mỗi lần. Hãy chọn khoảng ngắn hơn.", retry: false }
    case "INVALID_DATE":
      return { title: "Ngày không hợp lệ", message: "Hãy chọn lại ngày bắt đầu và kết thúc.", retry: false }
    default:
      return { title: "Không tải được số liệu", message: error.message, retry: true }
  }
}

function DashboardError({ error, onRetry }: { error: ApiError; onRetry: () => void }) {
  const { title, message, retry } = describe(error)
  return (
    <Alert variant="danger" title={title}>
      <div className="flex flex-wrap items-center gap-inline">
        <span>{message}</span>
        {retry ? (
          <Button variant="secondary" size="sm" onClick={onRetry}>
            Thử lại
          </Button>
        ) : null}
      </div>
    </Alert>
  )
}

export { DashboardError }
