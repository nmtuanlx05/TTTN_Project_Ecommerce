import { lazy } from "react"

/**
 * Trang admin nạp muộn: khách storefront không phải tải recharts, bảng, form... của khu quản trị.
 * `<Suspense>` nằm trong khung admin (`AdminLayout`) nên khung không biến mất khi tải chunk của từng trang.
 */
export const CategoriesPage = lazy(() => import("@/pages/admin/categories"))
export const DashboardPage = lazy(() => import("@/pages/admin/dashboard"))
export const InventoryPage = lazy(() => import("@/pages/admin/inventory"))
export const ProductCreatePage = lazy(() => import("@/pages/admin/products/new"))
export const ProductEditPage = lazy(() => import("@/pages/admin/products/edit"))
export const ProductsPage = lazy(() => import("@/pages/admin/products"))
export const UsersPage = lazy(() => import("@/pages/admin/users"))
