import { BrandLogo } from "@/components/shared/brand-logo"
import { STORE } from "@/lib/store-info"

/**
 * Cột đầu của chân trang: tên, mô tả, thông tin liên hệ. Liên hệ chưa có thì ghi "đang được cập nhật" thay vì bịa;
 * điền ở `lib/store-info.ts`.
 */
function FooterBrand() {
  const { contact } = STORE
  const contactLines = [contact.address, contact.phone, contact.email, contact.hours].filter(
    (line): line is string => Boolean(line),
  )

  return (
    <div className="flex flex-col gap-stack">
      <BrandLogo />
      <p className="max-w-xs text-body-sm text-ink-muted">{STORE.footer.description}</p>
      <div className="flex flex-col gap-1">
        {contactLines.length > 0 ? (
          contactLines.map((line) => (
            <p key={line} className="text-caption text-ink-muted">
              {line}
            </p>
          ))
        ) : (
          <p className="text-caption text-ink-muted">{STORE.contactPending}</p>
        )}
      </div>
    </div>
  )
}

export { FooterBrand }
