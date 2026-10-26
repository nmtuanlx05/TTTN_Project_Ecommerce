import { Outlet } from "react-router-dom"
import { AdminSidebar } from "@/components/admin/admin-sidebar"
import { AdminTopbar, type AdminAccount } from "@/components/admin/admin-topbar"
import { TooltipProvider } from "@/components/ui/tooltip"
import type { Role } from "@/types/user"

/**
 * Vỏ của khu quản trị. `.density-admin` đặt ở đây một lần — mọi component bên
 * trong tự thắt lại theo mật độ admin mà không cần biến thể riêng.
 */
function AdminLayout({
  account,
  role,
  onLogout,
  loggingOut,
}: {
  account: AdminAccount
  role: Role
  onLogout: () => void
  loggingOut: boolean
}) {
  return (
    <TooltipProvider>
      <div className="density-admin flex min-h-dvh bg-canvas">
        <AdminSidebar role={role} />
        <div className="flex min-w-0 flex-1 flex-col">
          <AdminTopbar
            account={account}
            role={role}
            onLogout={onLogout}
            loggingOut={loggingOut}
          />
          <main className="flex-1 px-gutter py-section">
            <Outlet />
          </main>
        </div>
      </div>
    </TooltipProvider>
  )
}

export { AdminLayout }
