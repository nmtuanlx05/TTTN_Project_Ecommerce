import type { StoreLocation } from "@/lib/store-info"

const DETAIL_LINK =
  "inline-flex min-h-control items-center text-ink underline decoration-ink decoration-1 underline-offset-4 transition-colors duration-(--motion-fast) ease-smooth hover:decoration-transparent"

/** Chỉ cho phép http/https: dữ liệu cấu hình sai thì không dựng liên kết thay vì dẫn tới `javascript:`. */
function isHttpUrl(value: string): boolean {
  return /^https?:\/\//i.test(value)
}

/** Một cửa hàng: tên (h2), địa chỉ, và chỉ những dòng có dữ liệu (điện thoại, giờ mở cửa, liên kết bản đồ). */
function StoreEntry({ store }: { store: StoreLocation }) {
  return (
    <article className="grid gap-stack border-t border-border-subtle py-8 first:border-t-0 first:pt-0 md:py-10 md:grid-cols-12 md:gap-x-6">
      <h2 className="text-h3 text-ink md:col-span-4">{store.name}</h2>
      <div className="flex flex-col items-start gap-1 text-body text-ink md:col-span-8">
        <p>{store.address}</p>
        {store.phone ? (
          <a href={`tel:${store.phone.replace(/[^\d+]/g, "")}`} className={DETAIL_LINK}>
            {store.phone}
          </a>
        ) : null}
        {store.hours ? <p className="text-body-sm text-ink-muted">{store.hours}</p> : null}
        {store.mapUrl && isHttpUrl(store.mapUrl) ? (
          <a href={store.mapUrl} target="_blank" rel="noopener noreferrer" className={DETAIL_LINK}>
            Xem bản đồ<span className="sr-only"> của {store.name} (mở tab mới)</span>
          </a>
        ) : null}
      </div>
    </article>
  )
}

export { StoreEntry }
