import { useLocation } from "react-router-dom"
import { Hammer } from "lucide-react"
import { PageHeader } from "@/components/admin/page-header"
import { EmptyState } from "@/components/ui/empty-state"
import { NAV_ITEMS } from "@/components/admin/nav-items"

/** Trang trống cho các mục menu chưa dựng. */
function PlaceholderPage() {
  const { pathname } = useLocation()
  const item = NAV_ITEMS.find((navItem) => pathname.startsWith(navItem.to))

  return (
    <div className="flex flex-col gap-section">
      <PageHeader
        title={item?.label ?? "Chưa có"}
        description={item?.description}
      />
      <EmptyState
        icon={Hammer}
        title="Màn hình này chưa dựng"
        description="Hiện mới có Tổng quan. Các mục còn lại sẽ được làm lần lượt theo từng module."
      />
    </div>
  )
}

export default PlaceholderPage
