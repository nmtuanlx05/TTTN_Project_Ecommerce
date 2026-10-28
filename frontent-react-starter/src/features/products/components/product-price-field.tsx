import { Controller, useFormContext } from "react-hook-form"
import { Field } from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { formatVnd } from "@/lib/format"
import { formatPriceInput, parsePriceInput } from "../price-input"
import type { ProductFormValues } from "../schemas"

/**
 * Giá bán: gõ số nguyên VND ("199000" hoặc "199.000"), rời ô thì tự thêm dấu ngăn nghìn.
 * Dưới ô hiện giá đã định dạng để soát nhanh số 0.
 */
function ProductPriceField({ id }: { id: string }) {
  const { control } = useFormContext<ProductFormValues>()

  return (
    <Controller
      control={control}
      name="price"
      render={({ field, fieldState }) => {
        const parsed = parsePriceInput(field.value)
        return (
          <Field
            label="Giá bán (VND)"
            htmlFor={id}
            required
            error={fieldState.error?.message}
            description={
              parsed === null
                ? "Số nguyên VND, ví dụ 199000."
                : `Hiển thị cho khách: ${formatVnd(parsed)}`
            }
          >
            <Input
              ref={field.ref}
              name={field.name}
              value={field.value}
              inputMode="numeric"
              autoComplete="off"
              data-numeric
              onChange={field.onChange}
              onBlur={() => {
                field.onChange(formatPriceInput(field.value))
                field.onBlur()
              }}
            />
          </Field>
        )
      }}
    />
  )
}

export { ProductPriceField }
