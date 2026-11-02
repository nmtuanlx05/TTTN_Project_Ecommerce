import { Trash2 } from "lucide-react"
import { Controller, useFormContext } from "react-hook-form"
import { Link } from "react-router-dom"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { Field } from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { formatNumber } from "@/lib/format"
import { inventoryLinkOf } from "../inventory-link"
import type { ProductFormValues } from "../schemas"
import type { ProductVariant } from "../types"

/**
 * Một hàng biến thể. `saved` có = biến thể đã lưu: không xóa được (chỉ sửa hoặc ngừng bán). Không có = hàng
 * mới thêm, bỏ được trước khi lưu. Tồn kho chỉ đọc và liên kết sang Kho lấy từ `live` (bản mới nhất từ
 * query, khớp theo id); hàng chưa lưu không có `live` nên không hiện tồn và không có liên kết.
 */
function ProductVariantRow({
  index,
  idPrefix,
  saved,
  live,
  productIsActive,
  canRemove,
  onRemove,
}: {
  index: number
  idPrefix: string
  saved: ProductVariant | undefined
  live: ProductVariant | undefined
  /** Cờ hiện/ẩn của sản phẩm trên server, để quyết định bật `includeHidden` trong liên kết kho. */
  productIsActive: boolean
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

      {live ? (
        <p className="text-caption text-ink-muted">
          Tồn kho <span data-numeric>{formatNumber(live.stock)}</span> · Đang giữ{" "}
          <span data-numeric>{formatNumber(live.reserved)}</span> · Khả dụng{" "}
          <span data-numeric>{formatNumber(live.stock - live.reserved)}</span>. Chỉ xem ở đây.{" "}
          <Link
            to={inventoryLinkOf(live, productIsActive)}
            className="rounded-xs text-ink underline underline-offset-4 outline-none hover:text-ink-muted focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
          >
            Quản lý tồn kho
          </Link>
        </p>
      ) : null}
    </li>
  )
}

export { ProductVariantRow }
