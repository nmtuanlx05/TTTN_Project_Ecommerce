import { useState, type ReactNode } from "react"
import { Dialog } from "@base-ui/react/dialog"
import { SlidersHorizontal } from "lucide-react"
import { StorefrontDrawer } from "@/components/storefront/storefront-drawer"
import { Button } from "@/components/ui/button"
import { formatNumber } from "@/lib/format"

/**
 * Ngăn kéo bộ lọc (dưới `lg`). KHÔNG tự đóng khi query đổi: các lựa chọn bên trong là liên kết `replace` đổi URL nhưng
 * ngăn kéo chỉ đóng bằng nút "Xem N sản phẩm", Esc hoặc bấm nền. Vì vậy trạng thái mở nằm ở `useState` thường, không dùng
 * `useOpenUntilNavigation`, và component này phải luôn được dựng (không nằm sau nhánh loading/lỗi/rỗng).
 */
function FilterDrawer({
  activeCount,
  total,
  children,
}: {
  activeCount: number
  /** Tổng kết quả hiện tại; chưa có thì nút ghi "Xem kết quả". */
  total: number | undefined
  children: ReactNode
}) {
  const [open, setOpen] = useState(false)

  return (
    <StorefrontDrawer
      open={open}
      onOpenChange={setOpen}
      side="right"
      title="Bộ lọc"
      className="soft-ui"
      trigger={<Button variant="secondary" className="press lg:hidden" />}
      triggerContent={
        <>
          <SlidersHorizontal />
          Bộ lọc{activeCount > 0 ? ` (${activeCount})` : ""}
        </>
      }
    >
      <div className="flex-1 overflow-y-auto p-gutter">{children}</div>
      <div className="border-t border-border-subtle p-gutter">
        <Dialog.Close render={<Button className="press w-full" />}>
          {total === undefined ? "Xem kết quả" : `Xem ${formatNumber(total)} sản phẩm`}
        </Dialog.Close>
      </div>
    </StorefrontDrawer>
  )
}

export { FilterDrawer }
