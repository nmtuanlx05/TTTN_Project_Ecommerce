import { useState } from "react"
import { Link, useLocation } from "react-router-dom"
import { ChevronRight, LogOut, Menu, UserRound } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet"
import { ThemeToggle } from "@/components/admin/theme-toggle"
import { AdminNav } from "@/components/admin/admin-sidebar"
import { NAV_ITEMS } from "@/components/admin/nav-items"

function useBreadcrumb() {
  const { pathname } = useLocation()
  const match = NAV_ITEMS.find((item) => pathname.startsWith(item.to))
  return match?.label ?? "Quản trị"
}

function AdminTopbar() {
  const [drawerOpen, setDrawerOpen] = useState(false)
  const current = useBreadcrumb()

  return (
    <header className="sticky top-0 z-30 flex h-16 items-center gap-inline border-b border-border-subtle bg-canvas px-gutter">
      {/* Dưới 1024px: menu thành drawer */}
      <Sheet open={drawerOpen} onOpenChange={setDrawerOpen}>
        <SheetTrigger
          render={
            <Button variant="ghost" size="icon" className="lg:hidden" aria-label="Mở menu" />
          }
        >
          <Menu />
        </SheetTrigger>
        <SheetContent side="left" className="w-72 bg-surface-sunken p-0">
          <SheetTitle className="border-b border-border-subtle px-4 py-4 font-display text-body uppercase tracking-[0.12em]">
            Thời trang
          </SheetTitle>
          <SheetDescription className="sr-only">
            Điều hướng giữa các khu vực của trang quản trị
          </SheetDescription>
          <AdminNav onNavigate={() => setDrawerOpen(false)} />
        </SheetContent>
      </Sheet>

      <nav aria-label="Đường dẫn" className="min-w-0 flex-1">
        <ol className="flex items-center gap-1.5 text-body-sm text-ink-muted">
          <li>
            <Link
              to="/admin/dashboard"
              className="rounded-xs outline-none hover:text-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
            >
              Quản trị
            </Link>
          </li>
          <li aria-hidden="true">
            <ChevronRight className="size-3.5" />
          </li>
          <li className="truncate font-medium text-ink" aria-current="page">
            {current}
          </li>
        </ol>
      </nav>

      <ThemeToggle />

      <DropdownMenu>
        <DropdownMenuTrigger
          render={<Button variant="secondary" size="sm" aria-label="Tài khoản" />}
        >
          <UserRound />
          <span className="hidden sm:inline">Nguyễn Mạnh Tuấn</span>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-56">
          <DropdownMenuLabel>
            <span className="block text-body-sm text-ink">Nguyễn Mạnh Tuấn</span>
            <span className="block text-caption font-normal text-ink-muted">
              Quản trị viên
            </span>
          </DropdownMenuLabel>
          <DropdownMenuSeparator />
          <DropdownMenuItem>
            <UserRound />
            Hồ sơ của tôi
          </DropdownMenuItem>
          <DropdownMenuItem>
            <LogOut />
            Đăng xuất
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </header>
  )
}

export { AdminTopbar }
