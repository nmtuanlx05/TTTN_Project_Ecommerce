import { useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { ChevronRight, Menu } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { ThemeToggle } from "@/components/shared/theme-toggle";
import { UserMenu, type UserMenuAccount } from "@/components/shared/user-menu";
import { AdminNav } from "@/components/admin/admin-sidebar";
import { NAV_ITEMS } from "@/components/admin/nav-items";
import type { Role } from "@/types/user";

function useBreadcrumb() {
  const { pathname } = useLocation();
  const match = NAV_ITEMS.find((item) => pathname.startsWith(item.to));
  return match?.label ?? "Quản trị";
}

/** Thông tin hiện ở topbar. Truyền từ ngoài vào vì components/ không được đọc phiên đăng nhập. */
type AdminAccount = Omit<UserMenuAccount, "canAccessAdmin">;

function AdminTopbar({
  account,
  role,
  onLogout,
  loggingOut,
}: {
  account: AdminAccount;
  role: Role;
  onLogout: () => void;
  loggingOut: boolean;
}) {
  const [drawerOpen, setDrawerOpen] = useState(false);
  const current = useBreadcrumb();

  return (
    <header className="sticky top-0 z-30 flex h-16 items-center gap-inline border-b border-border-subtle bg-canvas px-gutter">
      {/* Dưới 1024px: menu thành drawer */}
      <Sheet open={drawerOpen} onOpenChange={setDrawerOpen}>
        <SheetTrigger
          render={
            <Button
              variant="ghost"
              size="icon"
              className="lg:hidden"
              aria-label="Mở menu"
            />
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
          <AdminNav role={role} onNavigate={() => setDrawerOpen(false)} />
        </SheetContent>
      </Sheet>

      <nav aria-label="Đường dẫn" className="min-w-0 flex-1">
        <ol className="flex items-center gap-1.5 text-body-sm text-ink-muted">
          <li>
            <Link
              to="/admin"
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

      <UserMenu
        account={{ ...account, canAccessAdmin: false }}
        onLogout={onLogout}
        loggingOut={loggingOut}
      />
    </header>
  );
}

export { AdminTopbar };
export type { AdminAccount };
