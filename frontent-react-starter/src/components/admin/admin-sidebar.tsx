import { NavLink } from "react-router-dom";
import { cn } from "@/lib/utils";
import { NAV_ITEMS } from "@/components/admin/nav-items";

/**
 * Menu điều hướng của khu quản trị.
 *
 * Viết riêng thay vì dùng src/components/ui/sidebar.tsx của shadcn: bản đó
 * chuyển sang drawer ở 768px (ta cần 1024px) và mang theo bộ style riêng
 * (nền khối, bo góc, rail) không khớp tông hairline của hệ thống này.
 */
function AdminNav({ onNavigate }: { onNavigate?: () => void }) {
  return (
    <nav
      aria-label="Điều hướng khu quản trị"
      className="flex flex-col gap-0.5 p-2"
    >
      {NAV_ITEMS.map(({ to, label, icon: Icon, ready }) => (
        <NavLink
          key={to}
          to={to}
          onClick={onNavigate}
          className={({ isActive }) =>
            cn(
              "flex items-center gap-inline rounded-xs px-3 py-2 text-body-sm transition-colors",
              "outline-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring",
              isActive
                ? "bg-primary text-primary-fg"
                : "text-ink-muted hover:bg-surface-hover hover:text-ink",
            )
          }
        >
          <Icon className="size-4 shrink-0" aria-hidden="true" />
          <span className="truncate">{label}</span>
          {!ready ? (
            <span className="ml-auto text-caption text-ink-subtle">Sắp có</span>
          ) : null}
        </NavLink>
      ))}
    </nav>
  );
}

/** Cột trái cố định, chỉ hiện từ 1024px trở lên. */
function AdminSidebar() {
  return (
    <aside className="hidden w-60 shrink-0 border-r border-border-subtle bg-surface-sunken lg:flex lg:flex-col">
      <div className="flex h-16 items-center border-b border-border-subtle px-4">
        <span className="font-display text-body uppercase tracking-[0.12em] text-ink">
          MONO STUDIO
        </span>
      </div>
      <AdminNav />
      <div className="mt-auto border-t border-border-subtle p-4">
        <p className="text-caption text-ink-muted">Khu quản trị nội bộ</p>
      </div>
    </aside>
  );
}

export { AdminSidebar, AdminNav };
