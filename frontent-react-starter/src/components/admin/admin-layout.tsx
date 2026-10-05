import { Outlet } from "react-router-dom"
import { AdminSidebar } from "@/components/admin/admin-sidebar"
import { AdminTopbar } from "@/components/admin/admin-topbar"
import { ToastProvider, ToastViewport } from "@/components/ui/toast"

/**
 * Vỏ của khu quản trị. `.density-admin` đặt ở đây một lần — mọi component bên
 * trong tự thắt lại theo mật độ admin mà không cần biến thể riêng.
 */
function AdminLayout() {
  return (
    <ToastProvider>
      <div className="density-admin flex min-h-dvh bg-canvas">
        <AdminSidebar />
        <div className="flex min-w-0 flex-1 flex-col">
          <AdminTopbar />
          <main className="flex-1 px-gutter py-section">
            <Outlet />
          </main>
        </div>
      </div>
      <ToastViewport />
    </ToastProvider>
  )
}

export { AdminLayout }
