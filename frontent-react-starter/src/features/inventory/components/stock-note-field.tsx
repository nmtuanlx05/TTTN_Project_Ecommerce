import type { UseFormRegisterReturn } from "react-hook-form"
import { Field } from "@/components/ui/field"
import { Textarea } from "@/components/ui/textarea"
import { NOTE_MAX_LENGTH } from "../constants"

/** Ô ghi chú dùng chung các form kho. `required` chỉ để hiện dấu *; luật bắt buộc nằm ở schema. */
function StockNoteField({
  id,
  register,
  error,
  required = false,
}: {
  id: string
  register: UseFormRegisterReturn
  error?: string
  required?: boolean
}) {
  return (
    <Field
      label="Ghi chú"
      htmlFor={id}
      required={required}
      error={error}
      description={required ? undefined : `Tùy chọn, tối đa ${NOTE_MAX_LENGTH} ký tự.`}
    >
      <Textarea rows={2} {...register} />
    </Field>
  )
}

export { StockNoteField }
