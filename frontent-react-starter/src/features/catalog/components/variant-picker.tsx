import { useId } from "react"
import type { CatalogVariant } from "../types"
import {
  describeOption,
  optionValues,
  selectOption,
  type Axis,
  type VariantChoice,
} from "../variant-options"
import { OptionChipGroup } from "./option-chip-group"

const AXES: ReadonlyArray<{ axis: Axis; label: string }> = [
  { axis: "color", label: "Màu sắc" },
  { axis: "size", label: "Kích thước" },
]

/** Hai nhóm chip: màu rồi size. Nhãn nhóm ghi kèm giá trị đang chọn. */
function VariantPicker({
  variants,
  choice,
  onChange,
}: {
  variants: CatalogVariant[]
  choice: VariantChoice
  onChange: (choice: VariantChoice) => void
}) {
  const id = useId()

  return (
    <div className="flex flex-col gap-6">
      {AXES.map(({ axis, label }) => (
        <div key={axis} className="flex flex-col gap-3">
          <p id={`${id}-${axis}`} className="text-overline uppercase text-ink">
            {label}: <span className="font-normal normal-case text-ink-muted">{choice[axis]}</span>
          </p>
          <OptionChipGroup
            labelId={`${id}-${axis}`}
            selected={choice[axis]}
            options={optionValues(variants, axis).map((value) => ({
              value,
              ...describeOption(variants, choice, axis, value),
            }))}
            onSelect={(value) => onChange(selectOption(variants, choice, axis, value))}
          />
        </div>
      ))}
    </div>
  )
}

export { VariantPicker }
