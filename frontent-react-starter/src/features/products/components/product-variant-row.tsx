import { Trash2 } from "lucide-react"
import { Controller, useFormContext } from "react-hook-form"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { Field } from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { formatNumber } from "@/lib/format"
import type { ProductFormValues } from "../schemas"
import type { ProductVariant } from "../types"

/**
 * Một hàng biến thể. `saved` có = biến thể đã lưu: không xóa được (chỉ sửa hoặc ngừng bán) và hiện
 * tồn kho chỉ đọc. Không có = hàng mới thêm, bỏ được trước khi lưu.
 */
function ProductVariantRow({
  index,
  idPrefix,
  saved,
  canRemove,
  onRemove,
}: {
  index: number
  idPrefix: string
  saved: ProductVariant | undefined
  canRemove: boolean
  onRemove: () => void
}) {
  const {
    register,
    control,
    formState: { errors },
  } = useFormContext<ProductFormValues>()
  const rowErrors = errors.variants?.[index]
  const id = `${idPrefix}-${index}`

  return (
    <li className="flex flex-col gap-stack rounded-md border border-border-subtle p-card">
      <div className="flex items-center justify-between gap-inline">
        <p className="text-body-sm font-semibold text-ink">
          Biến thể {index + 1}{" "}
          <span className="font-normal text-ink-muted">({saved ? "đã lưu" : "mới"})</span>
        </p>
        {!saved ? (
          <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            disabled={!canRemove}
            aria-label={`Bỏ biến thể ${index + 1}`}
            title={canRemove ? "Bỏ biến thể này" : "Sản phẩm cần ít nhất 1 biến thể"}
            onClick={onRemove}
          >
            <Trash2 />
          </Button>
        ) : null}
      </div>

      <div className="grid gap-stack sm:grid-cols-3">
        <Field label="SKU" htmlFor={`${id}-sku`} required error={rowErrors?.sku?.message}>
          <Input
            autoComplete="off"
            spellCheck={false}
            className="font-mono uppercase"
            {...register(`variants.${index}.sku`)}
          />
        </Field>
        <Field label="Size" htmlFor={`${id}-size`} required error={rowErrors?.size?.message}>
          <Input autoComplete="off" {...register(`variants.${index}.size`)} />
        </Field>
        <Field label="Màu" htmlFor={`${id}-color`} required error={rowErrors?.color?.message}>
          <Input autoComplete="off" {...register(`variants.${index}.color`)} />
        </Field>
      </div>

      <Controller
        control={control}
        name={`variants.${index}.isActive`}
        render={({ field }) => (
          <label className="flex w-fit items-center gap-inline text-body-sm text-ink">
            <Checkbox
              checked={field.value}
              onCheckedChange={(checked) => field.onChange(checked)}
              onBlur={field.onBlur}
              ref={field.ref}
            />
            Đang bán
          </label>
        )}
      />
      {rowErrors?.isActive?.message ? (
        <p role="alert" className="text-caption text-danger-fg">
          {rowErrors.isActive.message}
        </p>
      ) : null}

      {saved ? (
        <p className="text-caption text-ink-muted">
          Tồn kho <span data-numeric>{formatNumber(saved.stock)}</span> · Đang giữ{" "}
          <span data-numeric>{formatNumber(saved.reserved)}</span> · Khả dụng{" "}
          <span data-numeric>{formatNumber(saved.stock - saved.reserved)}</span>. Chỉ xem ở đây, nhập
          kho ở module Kho.
        </p>
      ) : null}
    </li>
  )
}

export { ProductVariantRow }
