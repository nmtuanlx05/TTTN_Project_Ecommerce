import { useEffect, useRef } from "react"
import { Controller, useFormContext, useWatch } from "react-hook-form"
import { Field } from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { cn } from "@/lib/utils"
import { COLOR_HEX_REGEX } from "../constants"
import type { ProductFormValues } from "../schemas"
import { inheritedHex, isSyncableHex, sameColorRows } from "../variant-color-sync"
import { foldKey } from "../schema-checks"

const START_HEX = "#FFFFFF"
const HINT = "Chưa có mã màu: thẻ sản phẩm sẽ không hiện chấm màu cho biến thể này."

/** Ô chọn màu gốc + ô nhập hex. Nhận `id`/`aria-*` do `Field` truyền vào và gắn cho ô nhập (nhãn "Mã màu" trỏ tới ô này). */
function HexControls({
  hex,
  ariaLabel,
  value,
  onBlur,
  onChange,
  ...inputProps
}: {
  hex: string
  ariaLabel: string
  value: string
  onBlur: () => void
  onChange: (value: string) => void
  id?: string
  "aria-invalid"?: boolean | "true" | "false"
  "aria-describedby"?: string
}) {
  const valid = COLOR_HEX_REGEX.test(hex.trim())
  return (
    <div className="flex items-center gap-inline">
      <label
        className={cn(
          "relative size-9 shrink-0 cursor-pointer rounded-4xl border",
          valid ? "border-ink/15" : "border-dashed border-border-control",
          "has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-ring",
        )}
        style={valid ? { backgroundColor: hex.trim() } : undefined}
      >
        <input
          type="color"
          value={(valid ? hex.trim() : START_HEX).toLowerCase()}
          aria-label={ariaLabel}
          onChange={(event) => onChange(event.target.value)}
          className="absolute inset-0 size-full cursor-pointer opacity-0"
        />
      </label>
      <Input
        {...inputProps}
        autoComplete="off"
        spellCheck={false}
        placeholder="#RRGGBB"
        maxLength={7}
        className="font-mono uppercase"
        value={value}
        onBlur={onBlur}
        onChange={(event) => onChange(event.target.value)}
      />
    </div>
  )
}

/**
 * Mã màu của một biến thể: ô chọn màu gốc (`<input type="color">`) cạnh ô nhập `#RRGGBB`. Chưa có mã thì ô chọn là chấm rỗng nét đứt (không phải màu đen mặc định),
 * bấm mới mở bảng chọn, khởi đầu từ #FFFFFF. Cùng tên màu thì dùng chung mã: đổi mã ở một biến thể áp cho mọi biến thể cùng tên màu trong form, và biến thể đổi tên màu
 * thành màu đã có mã thì tự nhận mã đó (chỉ khi ô của nó đang trống). Để trống là hợp lệ (gợi ý, không chặn).
 */
function VariantColorHexField({ index, id }: { index: number; id: string }) {
  const {
    control,
    getValues,
    setValue,
    formState: { errors },
  } = useFormContext<ProductFormValues>()
  const color = useWatch({ control, name: `variants.${index}.color` })
  const hex = useWatch({ control, name: `variants.${index}.colorHex` })
  const previous = useRef(foldKey(color))

  // Đổi tên màu (không tính lần dựng đầu, để mở trang sửa không tự làm form "đã đổi").
  useEffect(() => {
    const key = foldKey(color)
    if (key === previous.current) return
    previous.current = key
    const inherited = inheritedHex(getValues("variants"), index)
    if (inherited)
      setValue(`variants.${index}.colorHex`, inherited, {
        shouldDirty: true,
        shouldValidate: true,
      })
  }, [color, index, getValues, setValue])

  function applyToSameColor(value: string) {
    if (!isSyncableHex(value)) return
    for (const position of sameColorRows(getValues("variants"), index)) {
      setValue(`variants.${position}.colorHex`, value, {
        shouldDirty: true,
        shouldValidate: true,
      })
    }
  }

  const error = errors.variants?.[index]?.colorHex?.message

  return (
    <Controller
      control={control}
      name={`variants.${index}.colorHex`}
      render={({ field }) => {
        const change = (value: string) => {
          const next = isSyncableHex(value.trim().toUpperCase()) ? value.trim().toUpperCase() : value
          field.onChange(next)
          applyToSameColor(next.trim())
        }
        return (
          <Field label="Mã màu" htmlFor={`${id}-hex`} error={error} description={hex.trim() === "" ? HINT : undefined}>
            <HexControls
              hex={hex}
              ariaLabel={`Chọn mã màu cho biến thể ${index + 1}${color.trim() ? ` (${color.trim()})` : ""}`}
              value={field.value}
              onBlur={field.onBlur}
              onChange={change}
            />
          </Field>
        )
      }}
    />
  )
}

export { VariantColorHexField }
