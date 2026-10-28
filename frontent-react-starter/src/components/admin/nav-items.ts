import {
  Boxes,
  FolderTree,
  LayoutDashboard,
  ReceiptText,
  Shirt,
  TicketPercent,
  Users,
} from "lucide-react"
import type { Role } from "@/types/user"

export type NavItem = {
  to: string
  label: string
  icon: typeof LayoutDashboard
  /** Mô tả dùng cho trang trống của các mục chưa dựng */
  description: string
  ready: boolean
  /** Vai trò được vào mục này. Nguồn duy nhất: menu và route đều đọc từ đây (bảng quyền ở docs/cau-truc-thu-muc.md mục 7). */
  roles: Role[]
}

export const NAV_ITEMS: NavItem[] = [
  {
    to: "/admin/dashboard",
    label: "Tổng quan",
    icon: LayoutDashboard,
    description: "Doanh thu, đơn hàng và tồn kho trong một màn hình.",
    ready: true,
    roles: ["ADMIN"],
  },
  {
    to: "/admin/orders",
    label: "Đơn hàng",
    icon: ReceiptText,
    description: "Xác nhận, đóng gói và theo dõi đơn qua từng trạng thái.",
    ready: false,
    roles: ["ADMIN", "STAFF"],
  },
  {
    to: "/admin/products",
    label: "Sản phẩm",
    icon: Shirt,
    description: "Quản lý sản phẩm và các biến thể theo size, màu.",
    ready: false,
    roles: ["ADMIN", "STAFF"],
  },
  {
    to: "/admin/categories",
    label: "Danh mục",
    icon: FolderTree,
    description: "Sắp xếp sản phẩm vào danh mục để khách dễ tìm.",
    ready: true,
    roles: ["ADMIN", "STAFF"],
  },
  {
    to: "/admin/inventory",
    label: "Kho",
    icon: Boxes,
    description: "Nhập kho và theo dõi tồn khả dụng của từng biến thể.",
    ready: false,
    roles: ["ADMIN", "STAFF"],
  },
  {
    to: "/admin/vouchers",
    label: "Voucher",
    icon: TicketPercent,
    description: "Tạo và quản lý mã giảm giá cho đơn hàng.",
    ready: false,
    roles: ["ADMIN"],
  },
  {
    to: "/admin/users",
    label: "Người dùng",
    icon: Users,
    description: "Tài khoản khách hàng và nhân viên.",
    ready: true,
    roles: ["ADMIN"],
  },
]

/** Vai trò được vào một mục menu; ném lỗi nếu `to` không có trong NAV_ITEMS (route khai báo sai). */
export function navRoles(to: string): Role[] {
  const item = NAV_ITEMS.find((navItem) => navItem.to === to)
  if (!item) throw new Error(`Không có mục menu nào ứng với ${to}`)
  return item.roles
}
