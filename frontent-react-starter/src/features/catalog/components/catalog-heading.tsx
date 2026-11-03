import { formatNumber } from "@/lib/format"

/** Tiêu đề trang (h1 duy nhất) và số kết quả. Dòng số kết quả giữ chỗ khi chưa có để tiêu đề không nhảy; là vùng live. */
function CatalogHeading({ title, total }: { title: string; total: number | undefined }) {
  return (
    <div className="flex flex-col gap-2">
      <h1 className="text-h1 uppercase text-ink">{title}</h1>
      <p aria-live="polite" className="min-h-6 text-body-sm text-ink-muted">
        {total === undefined ? "" : `${formatNumber(total)} sản phẩm`}
      </p>
    </div>
  )
}

export { CatalogHeading }
