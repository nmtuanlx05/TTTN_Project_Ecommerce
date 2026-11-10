import type { ReactElement } from "react"
import { Outlet, Route } from "react-router-dom"
import { navRoles } from "@/components/admin/nav-items"
import NotFoundPage from "@/pages/not-found"
import {
  CategoriesPage,
  DashboardPage,
  InventoryPage,
  OrderDetailPage,
  OrdersPage,
  PaymentsPage,
  ProductCreatePage,
  ProductEditPage,
  ProductsPage,
  UsersPage,
  VouchersPage,
} from "./admin-pages"
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
        <Route path="orders" element={guarded("/admin/orders", <Outlet />)}>
          <Route index element={<OrdersPage />} />
          <Route path=":id" element={<OrderDetailPage />} />
          <Route path="*" element={<NotFoundPage />} />
        </Route>
        <Route path="payments" element={guarded("/admin/payments", <PaymentsPage />)} />
        <Route path="products" element={guarded("/admin/products", <Outlet />)}>
          <Route index element={<ProductsPage />} />
          <Route path="new" element={<ProductCreatePage />} />
          <Route path=":id/edit" element={<ProductEditPage />} />
          <Route path="*" element={<NotFoundPage />} />
        </Route>
        <Route path="categories/*" element={guarded("/admin/categories", <CategoriesPage />)} />
        <Route path="inventory" element={guarded("/admin/inventory", <InventoryPage />)} />
        <Route path="vouchers" element={guarded("/admin/vouchers", <VouchersPage />)} />
        <Route path="users/*" element={guarded("/admin/users", <UsersPage />)} />
        <Route path="*" element={<NotFoundPage />} />
      </Route>
    </Route>
  </Route>
)
