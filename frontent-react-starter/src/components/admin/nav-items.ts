import {
  Boxes,
  FolderTree,
  LayoutDashboard,
  ReceiptText,
  Shirt,
  TicketPercent,
  Users,
} from "lucide-react"

export type NavItem = {
  to: string
  label: string
  icon: typeof LayoutDashboard
  /** Mô tả dùng cho trang trống của các mục chưa dựng */
  description: string
  ready: boolean
}

export const NAV_ITEMS: NavItem[] = [
  {
    to: "/admin/dashboard",
    label: "Tổng quan",
    icon: LayoutDashboard,
    description: "Doanh thu, đơn hàng và tồn kho trong một màn hình.",
    ready: true,
  },
  {
    to: "/admin/orders",
    label: "Đơn hàng",
    icon: ReceiptText,
    description: "Xác nhận, đóng gói và theo dõi đơn qua từng trạng thái.",
    ready: false,
  },
  {
    to: "/admin/products",
    label: "Sản phẩm",
    icon: Shirt,
    description: "Quản lý sản phẩm và các biến thể theo size, màu.",
    ready: false,
  },
  {
    to: "/admin/categories",
    label: "Danh mục",
    icon: FolderTree,
    description: "Sắp xếp sản phẩm vào danh mục để khách dễ tìm.",
    ready: false,
  },
  {
    to: "/admin/inventory",
    label: "Kho",
    icon: Boxes,
    description: "Nhập kho và theo dõi tồn khả dụng của từng biến thể.",
    ready: false,
  },
  {
    to: "/admin/vouchers",
    label: "Voucher",
    icon: TicketPercent,
    description: "Tạo và quản lý mã giảm giá cho đơn hàng.",
    ready: false,
  },
  {
    to: "/admin/users",
    label: "Người dùng",
    icon: Users,
    description: "Tài khoản khách hàng và nhân viên.",
    ready: false,
  },
]
