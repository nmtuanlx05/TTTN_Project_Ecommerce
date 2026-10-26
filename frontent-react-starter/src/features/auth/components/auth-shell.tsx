import type { ReactNode } from "react";
import { BrandLogo } from "@/components/shared/brand-logo";
import { ThemeToggle } from "@/components/shared/theme-toggle";

/**
 * Khung trang đăng nhập và đăng ký: thương hiệu, nút đổi sáng/tối, thẻ ở giữa.
 * Nằm ngoài `.density-admin` nên dùng mật độ storefront (ô nhập cao 44px, đủ vùng bấm trên mobile).
 */
function AuthShell({
  title,
  description,
  footer,
  children,
}: {
  title: string;
  description?: string;
  footer?: ReactNode;
  children: ReactNode;
}) {
  return (
    <div className="flex min-h-dvh flex-col bg-canvas px-gutter">
      <header className="flex items-center justify-between py-stack">
        <BrandLogo to="/" />
        <ThemeToggle />
      </header>

      <main className="flex flex-1 items-center justify-center py-section">
        <section className="flex w-full max-w-md flex-col gap-section rounded-md border border-border-default bg-surface p-card">
          <div className="flex flex-col gap-stack">
            <div className="flex flex-col gap-1 align-middle text-center">
              <h1 className="text-h1 uppercase text-ink ">{title}</h1>
              {description ? (
                <p className="text-body-sm text-ink-muted">{description}</p>
              ) : null}
            </div>
            {children}
          </div>
          {footer ? (
            <p className="border-t border-border-subtle pt-stack text-body-sm text-ink-muted">
              {footer}
            </p>
          ) : null}
        </section>
      </main>
    </div>
  );
}

export { AuthShell };
