import { Menu } from "lucide-react"
import { Button } from "@/components/ui/button"
import { ThemeToggle } from "@/components/shared/theme-toggle"
import { useOpenUntilNavigation } from "@/hooks/use-open-until-navigation"
import type { CategoryNode } from "@/lib/category-tree"
import type { HeaderSession } from "./header-session"
import { MobileAccount } from "./mobile-account"
import { MobileCategoryList } from "./mobile-category-list"
import { StorefrontDrawer } from "./storefront-drawer"

/**
 * Nút menu + ngăn kéo trái (dưới `lg`): danh mục, tài khoản, đổi sáng/tối. Tự đóng khi pathname đổi hoặc khi bấm
 * một liên kết bên trong (`onNavigate`); focus trả về nút menu.
 */
function MobileNavDrawer({
  categories,
  session,
}: {
  categories: CategoryNode[]
  session: HeaderSession
}) {
  const [open, setOpen] = useOpenUntilNavigation()
  const close = () => setOpen(false)

  return (
    <StorefrontDrawer
      open={open}
      onOpenChange={setOpen}
      side="left"
      title="Menu"
      trigger={<Button variant="ghost" size="icon" aria-label="Mở menu" className="press lg:hidden" />}
      triggerContent={<Menu className="size-5" />}
    >
      <div className="flex flex-1 flex-col gap-stack overflow-y-auto p-gutter">
        <MobileCategoryList categories={categories} onNavigate={close} />
      </div>
      <div className="flex flex-col gap-stack border-t border-border-subtle p-gutter">
        <MobileAccount session={session} onNavigate={close} />
        <ThemeToggle className="self-start" />
      </div>
    </StorefrontDrawer>
  )
}

export { MobileNavDrawer }
