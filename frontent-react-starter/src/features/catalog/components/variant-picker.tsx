import { useId } from "react"
import { useToast } from "@/components/ui/toast"
import { STORE } from "@/lib/store-info"
import type { CatalogVariant } from "../types"
import {
  colorHexOf,
  describeInStockOption,
  describeOption,
  optionValues,
  selectInStockOption,
  selectOption,
  type Axis,
  type VariantChoice,
} from "../variant-options"
import { OptionChipGroup } from "./option-chip-group"

const AXES: ReadonlyArray<{ axis: Axis; label: string }> = [
  { axis: "color", label: "Màu sắc" },
  { axis: "size", label: "Kích thước" },
]

/**
 * Hai nhóm chọn: màu (chấm màu theo `colorHex` của biến thể; chưa có mã thì nút chữ) rồi size (pill). Nhãn nhóm ghi kèm giá trị đang chọn.
 * `inStockOnly` (hộp thoại "Thêm nhanh"): giá trị hết hàng bị mờ và không chọn được, lựa chọn luôn rơi vào biến thể còn hàng.
 * Link "Hướng dẫn chọn size" là STUB: chỉ hiện toast "chưa có tính năng" (docs/storefront-design.md mục 13), không bịa bảng số đo.
 */
function VariantPicker({
  variants,
  choice,
  onChange,
  inStockOnly = false,
}: {
  variants: CatalogVariant[]
  choice: VariantChoice
  onChange: (choice: VariantChoice) => void
  inStockOnly?: boolean
}) {
  const id = useId()
  const toast = useToast()

  return (
    <div className="flex flex-col gap-6">
      {AXES.map(({ axis, label }) => (
        <div key={axis} className="flex flex-col gap-1">
          <div className="flex items-center justify-between gap-inline">
            <p id={`${id}-${axis}`} className="text-overline uppercase text-ink">
              {label} <span className="ml-1 font-normal normal-case text-ink-muted">{choice[axis]}</span>
            </p>
            {axis === "size" ? (
              <button
                type="button"
                onClick={() =>
                  toast.add({
                    title: STORE.comingSoon.sizeGuide,
                    data: { tone: "info" },
                  })
                }
                className="inline-flex min-h-control items-center text-caption text-ink-muted underline underline-offset-4 transition-colors duration-(--motion-fast) ease-smooth hover:text-ink"
              >
                Hướng dẫn chọn size
              </button>
            ) : null}
          </div>
          <OptionChipGroup
            labelId={`${id}-${axis}`}
            variant={axis === "color" ? "swatch" : "pill"}
            selected={choice[axis]}
            options={optionValues(variants, axis).map((value) => ({
              value,
              ...(inStockOnly ? describeInStockOption(variants, axis, value) : describeOption(variants, choice, axis, value)),
              swatch: axis === "color" ? colorHexOf(variants, value) : undefined,
            }))}
            onSelect={(value) => onChange((inStockOnly ? selectInStockOption : selectOption)(variants, choice, axis, value))}
          />
        </div>
      ))}
    </div>
  )
}

export { VariantPicker }
