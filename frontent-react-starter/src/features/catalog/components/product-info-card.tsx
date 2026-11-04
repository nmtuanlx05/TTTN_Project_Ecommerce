import { ASSURANCE_ICONS } from "@/components/storefront/home/assurance-item"
import { formatVnd } from "@/lib/format"
import { HOME, type AssuranceIcon } from "@/lib/home-content"
import type { CatalogProductDetail } from "../types"
import { PurchasePanel, type AddToCartInput } from "./purchase-panel"

/** Ba trong bốn cam kết của trang chủ (không thêm tuyên bố mới; vẫn thuộc bảng cam kết chờ xác nhận ở docs/storefront-design.md mục 13). */
const PRODUCT_ASSURANCE_ICONS: readonly AssuranceIcon[] = ["truck", "return", "shield"]

const BADGE = "inline-flex items-center gap-2 rounded-4xl bg-canvas px-3 py-1 text-caption text-ink"

/**
 * Thẻ thông tin bên phải ảnh: nền `surface-sunken/50` bo `panel` như dải cam kết ở trang chủ. Từ trên xuống: hai huy hiệu (danh mục; còn/hết hàng theo
 * `product.inStock`, chấm xanh `success-fg` khi còn; API chi tiết chưa có `lowStock` nên không có "Sắp hết"), tên, giá, mô tả, chọn màu/size + hàng thao tác
 * (`PurchasePanel`), đường kẻ mảnh rồi ba dòng cam kết.
 *
 * Từ `lg` thẻ nằm trong ô lưới dính (xem `ProductDetailContent`) và CHÍNH THẺ là phần tử cuộn: `max-h` = `--sticky-max-h` (vừa vùng nhìn dưới header) và `overflow-y-auto`.
 * Vừa vùng nhìn thì không có thanh cuộn và không đổi bố cục; cửa sổ quá thấp thì nội dung tự cuộn bên trong (nền, bo góc, đệm của thẻ giữ nguyên, vòng focus
 * các ô sát mép nằm trong đệm 32px nên không bị cắt lúc nghỉ). Cố ý KHÔNG đặt `overscroll-contain`: cuộn hết thẻ thì cuộn tiếp trang, không kẹt.
 */
function ProductInfoCard({
  product,
  barSlot,
  onAddToCart,
}: {
  product: CatalogProductDetail
  barSlot: HTMLElement | null
  onAddToCart: (input: AddToCartInput) => void
}) {
  const assurances = HOME.assurances.filter((item) => PRODUCT_ASSURANCE_ICONS.includes(item.icon))

  return (
    <div className="scrollbar-soft flex flex-col gap-6 self-start rounded-panel bg-surface-sunken/50 p-6 sm:p-8 lg:max-h-(--sticky-max-h) lg:overflow-y-auto">
      <div className="flex flex-col gap-4">
        <div className="flex flex-wrap items-center gap-2">
          <span className={BADGE}>{product.category.name}</span>
          <span className={BADGE}>
            {product.inStock ? <span aria-hidden="true" className="size-2 rounded-4xl bg-success-fg" /> : null}
            {product.inStock ? "Còn hàng" : "Hết hàng"}
          </span>
        </div>
        <h1 className="text-h2 text-ink">{product.name}</h1>
        <p className="text-body font-semibold text-ink">{formatVnd(product.price)}</p>
        {product.description ? (
          <p className="max-w-prose whitespace-pre-line text-body-sm text-ink-muted">{product.description}</p>
        ) : null}
      </div>

      <PurchasePanel key={product.id} product={product} barSlot={barSlot} onAddToCart={onAddToCart} />

      <ul className="flex flex-col gap-3 border-t border-border-subtle pt-6">
        {assurances.map(({ icon, title }) => {
          const Icon = ASSURANCE_ICONS[icon]
          return (
            <li key={icon} className="flex items-center gap-3 text-body-sm text-ink">
              <Icon aria-hidden="true" className="size-4 shrink-0" strokeWidth={1.5} />
              {title}
            </li>
          )
        })}
      </ul>
    </div>
  )
}

export { ProductInfoCard }
