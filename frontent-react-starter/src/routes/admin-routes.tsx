import type { ReactElement } from "react"
import { Route } from "react-router-dom"
import { navRoles } from "@/components/admin/nav-items"
import DashboardPage from "@/pages/admin/dashboard"
import PlaceholderPage from "@/pages/admin/placeholder"
import UsersPage from "@/pages/admin/users"
import NotFoundPage from "@/pages/not-found"
import { AdminIndexRedirect } from "./admin-index-redirect"
import { AdminLayoutContainer } from "./admin-layout-container"
import { RequireAuth } from "./guards/require-auth"
import { RequireRole } from "./guards/require-role"

/** Bọc một trang bằng quyền khai báo ở nav-items (nguồn duy nhất của bảng quyền). */
function guarded(to: string, element: ReactElement) {
  return <RequireRole roles={navRoles(to)}>{element}</RequireRole>
}

/**
 * Khu /admin. Thứ tự guard: đăng nhập → vai trò ADMIN/STAFF → khung admin → quyền từng mục.
 * `*` nằm trong cùng cây nên /admin/abc khi chưa đăng nhập vẫn sang /login trước khi thấy 404.
 */
export const adminRoutes = (
  <Route path="/admin" element={<RequireAuth />}>
    <Route element={<RequireRole roles={["ADMIN", "STAFF"]} fullPage />}>
      <Route element={<AdminLayoutContainer />}>
        <Route index element={<AdminIndexRedirect />} />
        <Route path="dashboard" element={guarded("/admin/dashboard", <DashboardPage />)} />
        <Route path="orders/*" element={guarded("/admin/orders", <PlaceholderPage />)} />
        <Route path="products/*" element={guarded("/admin/products", <PlaceholderPage />)} />
        <Route
          path="categories/*"
          element={guarded("/admin/categories", <PlaceholderPage />)}
        />
        <Route path="inventory/*" element={guarded("/admin/inventory", <PlaceholderPage />)} />
        <Route path="vouchers/*" element={guarded("/admin/vouchers", <PlaceholderPage />)} />
        <Route path="users/*" element={guarded("/admin/users", <UsersPage />)} />
        <Route path="*" element={<NotFoundPage />} />
      </Route>
    </Route>
  </Route>
)
