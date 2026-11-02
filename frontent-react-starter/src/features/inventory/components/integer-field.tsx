import { Controller, type Control, type FieldValues, type Path } from "react-hook-form"
import { Field } from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { sanitizeQuantityInput } from "../quantity-input"

/**
 * Ô số nguyên không âm cho form kho: gõ hoặc dán chữ thì bị bỏ, chỉ giữ chữ số. Giá trị trong form là
 * chuỗi (schema ép sang số lúc gửi). Bàn phím số trên điện thoại nhờ `inputMode`.
 */
function IntegerField<T extends FieldValues>({
  control,
  name,
  id,
  label,
  description,
  required = true,
}: {
  control: Control<T>
  name: Path<T>
  id: string
  label: string
  description?: string
  required?: boolean
}) {
  return (
    <Controller
      control={control}
      name={name}
      render={({ field, fieldState }) => (
        <Field
          label={label}
          htmlFor={id}
          required={required}
          description={description}
          error={fieldState.error?.message}
        >
          <Input
            ref={field.ref}
            name={field.name}
            value={typeof field.value === "string" ? field.value : ""}
            inputMode="numeric"
            autoComplete="off"
            maxLength={10}
            data-numeric
            onChange={(event) => field.onChange(sanitizeQuantityInput(event.target.value))}
            onBlur={field.onBlur}
          />
        </Field>
      )}
    />
  )
}

export { IntegerField }
