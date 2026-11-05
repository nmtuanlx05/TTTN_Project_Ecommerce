import type { ChangeEvent } from "react"
import { Field } from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { DESCRIPTION_MAX_LENGTH } from "../constants"
import { lockedNote, type VoucherFieldsProps } from "./voucher-form-types"

/** Mã và mô tả. Mã tự chuyển HOA khi gõ (giữ nguyên vị trí con trỏ); mã bị khóa khi voucher đã được dùng. */
function VoucherBasicFields({ form, id, usedCount }: VoucherFieldsProps) {
  const { register, formState: { errors } } = form
  const locked = usedCount > 0
  const code = register("code")

  function handleCodeChange(event: ChangeEvent<HTMLInputElement>) {
    const input = event.target
    const { selectionStart, selectionEnd } = input
    input.value = input.value.toUpperCase()
    input.setSelectionRange(selectionStart, selectionEnd)
    return code.onChange(event)
  }

  return (
    <>
      <Field
        label="Mã voucher"
        htmlFor={`${id}-code`}
        required
        error={errors.code?.message}
        description={
          locked ? lockedNote(usedCount) : "Tự chuyển thành chữ HOA. 3 đến 30 ký tự: A-Z, 0-9, _ và -."
        }
      >
        <Input
          autoComplete="off"
          spellCheck={false}
          disabled={locked}
          className="font-mono uppercase"
          {...code}
          onChange={handleCodeChange}
        />
      </Field>

      <Field
        label="Mô tả"
        htmlFor={`${id}-description`}
        error={errors.description?.message}
        description={`Không bắt buộc, tối đa ${DESCRIPTION_MAX_LENGTH} ký tự. Hiện cho khách khi chọn mã.`}
      >
        <Input autoComplete="off" {...register("description")} />
      </Field>
    </>
  )
}

export { VoucherBasicFields }
