import { Banknote, Percent } from "lucide-react"
import { Controller, useWatch } from "react-hook-form"
import { RadioCard } from "@/components/shared/radio-card"
import { Field } from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { cn } from "@/lib/utils"
import type { DiscountType } from "../types"
import { lockedNote, type VoucherFieldsProps } from "./voucher-form-types"

const TYPES: { value: DiscountType; title: string; description: string; icon: typeof Percent }[] = [
  { value: "PERCENT", title: "Phần trăm", description: "Giảm theo % tạm tính, có thể đặt mức giảm tối đa.", icon: Percent },
  { value: "FIXED", title: "Số tiền cố định", description: "Giảm một số tiền cụ thể (₫).", icon: Banknote },
]

/** Loại giảm (radio-card), giá trị và mức giảm tối đa (chỉ với phần trăm). Cả ba bị khóa khi voucher đã được dùng. */
function VoucherDiscountFields({ form, id, usedCount }: VoucherFieldsProps) {
  const { register, control, setValue, formState: { errors } } = form
  const locked = usedCount > 0
  const type = useWatch({ control, name: "discountType" })

  return (
    <>
      <div className="flex flex-col gap-1.5">
        <Label id={`${id}-type-label`}>Loại giảm giá</Label>
        <Controller
          control={control}
          name="discountType"
          render={({ field }) => (
            <div
              role="radiogroup"
              aria-labelledby={`${id}-type-label`}
              aria-disabled={locked || undefined}
              className={cn("flex flex-col gap-inline", locked && "opacity-60")}
            >
              {TYPES.map((item) => (
                <RadioCard
                  key={item.value}
                  checked={field.value === item.value}
                  unavailable={locked}
                  title={item.title}
                  description={item.description}
                  icon={<item.icon className="size-5" aria-hidden="true" />}
                  onSelect={() => {
                    if (locked) return
                    field.onChange(item.value)
                    // Voucher số tiền cố định không có mức giảm tối đa (backend trả 400 nếu có).
                    if (item.value === "FIXED") setValue("maxDiscount", "")
                  }}
                />
              ))}
            </div>
          )}
        />
        {locked ? <p className="text-caption text-ink-muted">{lockedNote(usedCount)}</p> : null}
      </div>

      <Field
        label={type === "PERCENT" ? "Phần trăm giảm (%)" : "Số tiền giảm (₫)"}
        htmlFor={`${id}-value`}
        required
        error={errors.discountValue?.message}
        description={type === "PERCENT" ? "Số nguyên từ 1 đến 100." : "Số nguyên lớn hơn 0, tính bằng đồng."}
      >
        <Input inputMode="numeric" autoComplete="off" disabled={locked} {...register("discountValue")} />
      </Field>

      {type === "PERCENT" ? (
        <Field
          label="Giảm tối đa (₫)"
          htmlFor={`${id}-max`}
          error={errors.maxDiscount?.message}
          description="Để trống nếu không giới hạn mức giảm."
        >
          <Input inputMode="numeric" autoComplete="off" disabled={locked} {...register("maxDiscount")} />
        </Field>
      ) : null}
    </>
  )
}

export { VoucherDiscountFields }
