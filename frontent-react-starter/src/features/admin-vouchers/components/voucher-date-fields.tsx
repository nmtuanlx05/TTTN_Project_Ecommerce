import { Field } from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { lockedNote, type VoucherFieldsProps } from "./voucher-form-types"

/**
 * Ngày áp dụng theo giờ Việt Nam. Giá trị của `<input type="date">` đã là chuỗi YYYY-MM-DD nên gửi thẳng,
 * không qua Date. Mã chạy từ 00:00 ngày bắt đầu đến hết ngày kết thúc. Ngày bắt đầu bị khóa khi voucher đã được dùng.
 */
function VoucherDateFields({ form, id, usedCount }: VoucherFieldsProps) {
  const { register, formState: { errors } } = form
  const locked = usedCount > 0

  return (
    <div className="grid gap-stack sm:grid-cols-2">
      <Field
        label="Ngày bắt đầu"
        htmlFor={`${id}-starts`}
        required
        error={errors.startsAtDate?.message}
        description={locked ? lockedNote(usedCount) : undefined}
      >
        <Input type="date" disabled={locked} {...register("startsAtDate")} />
      </Field>
      <Field
        label="Ngày kết thúc"
        htmlFor={`${id}-expires`}
        required
        error={errors.expiresAtDate?.message}
        description="Dùng được đến hết ngày này."
      >
        <Input type="date" {...register("expiresAtDate")} />
      </Field>
    </div>
  )
}

export { VoucherDateFields }
