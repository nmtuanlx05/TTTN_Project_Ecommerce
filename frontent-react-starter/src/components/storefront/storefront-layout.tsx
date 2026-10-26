import type { ReactNode } from "react"
import { Outlet } from "react-router-dom"
import { StorefrontFooter } from "@/components/storefront/storefront-footer"

/**
 * Khung của khu khách: header (do container nối phiên rồi truyền vào), nội dung, chân trang.
 * Nằm ngoài `.density-admin` nên dùng mật độ storefront.
 */
function StorefrontLayout({ header }: { header: ReactNode }) {
  return (
    <div className="flex min-h-dvh flex-col bg-canvas">
      {header}
      <main className="flex-1">
        <Outlet />
      </main>
      <StorefrontFooter />
    </div>
  )
}

export { StorefrontLayout }
