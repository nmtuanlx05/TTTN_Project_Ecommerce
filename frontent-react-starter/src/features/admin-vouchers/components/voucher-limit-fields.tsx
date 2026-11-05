import { Controller, useWatch } from "react-hook-form"
import { Field } from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { Switch } from "@/components/ui/switch"
import type { VoucherFieldsProps } from "./voucher-form-types"

/** Đơn tối thiểu và giới hạn lượt dùng. Khi đã có người dùng, giới hạn lượt không được thấp hơn `usedCount`. */
function VoucherLimitFields({ form, id, usedCount }: VoucherFieldsProps) {
  const { register, control, clearErrors, formState: { errors } } = form
  const unlimited = useWatch({ control, name: "unlimited" })

  return (
    <>
      <Field
        label="Đơn tối thiểu (₫)"
        htmlFor={`${id}-min`}
        required
        error={errors.minOrderValue?.message}
        description="Tạm tính của đơn phải đạt mức này mới dùng được mã. Nhập 0 nếu không yêu cầu."
      >
        <Input inputMode="numeric" autoComplete="off" {...register("minOrderValue")} />
      </Field>

      <div className="flex flex-col gap-1.5">
        <div className="flex items-center justify-between gap-inline">
          <span id={`${id}-unlimited-label`} className="text-body-sm font-medium text-ink">
            Không giới hạn lượt dùng
          </span>
          <Controller
            control={control}
            name="unlimited"
            render={({ field }) => (
              <Switch
                checked={field.value}
                aria-labelledby={`${id}-unlimited-label`}
                onCheckedChange={(next) => {
                  field.onChange(next)
                  if (next) clearErrors("usageLimit")
                }}
              />
            )}
          />
        </div>
        {unlimited ? null : (
          <Field
            label="Số lượt dùng tối đa"
            htmlFor={`${id}-limit`}
            required
            error={errors.usageLimit?.message}
            description={
              usedCount > 0
                ? `Tối thiểu ${usedCount} (số lượt đã dùng).`
                : "Tổng số lần mã được dùng, từ 1 trở lên."
            }
          >
            <Input inputMode="numeric" autoComplete="off" {...register("usageLimit")} />
          </Field>
        )}
      </div>
    </>
  )
}

export { VoucherLimitFields }
