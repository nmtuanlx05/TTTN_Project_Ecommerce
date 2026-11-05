import type { UseQueryResult } from "@tanstack/react-query"
import type { UseFormReturn } from "react-hook-form"
import { Field } from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import type { ApiError } from "@/lib/api-error"
import type { CheckoutFormValues } from "../schemas"
import type { LocationItem } from "../types"
import { CheckoutCard } from "./checkout-card"
import { LocationFields } from "./location-fields"

/** Thẻ (1) "Thông tin giao hàng". Lưới hai cột: [Họ tên | SĐT], [Tỉnh | Quận], [Phường | Địa chỉ cụ thể], ghi chú dài hết hàng. */
function ShippingCard({
  form,
  wards,
  hasWards,
  onDistrictChange,
}: {
  form: UseFormReturn<CheckoutFormValues>
  wards: UseQueryResult<LocationItem[], ApiError>
  hasWards: boolean
  onDistrictChange: (code: string) => void
}) {
  const { register, formState } = form
  const { errors } = formState
  return (
    <CheckoutCard step={1} title="Thông tin giao hàng">
      <div className="grid gap-stack sm:grid-cols-2">
        <Field label="Họ và tên" htmlFor="checkout-name" error={errors.receiverName?.message} required>
          <Input autoComplete="name" {...register("receiverName")} />
        </Field>
        <Field label="Số điện thoại" htmlFor="checkout-phone" error={errors.phone?.message} required>
          <Input type="tel" inputMode="tel" autoComplete="tel" {...register("phone")} />
        </Field>
        <LocationFields form={form} wards={wards} hasWards={hasWards} onDistrictChange={onDistrictChange} />
        <Field label="Địa chỉ cụ thể" htmlFor="checkout-address" error={errors.addressLine?.message} required>
          <Input autoComplete="address-line1" {...register("addressLine")} />
        </Field>
        <Field
          label="Ghi chú (tuỳ chọn)"
          htmlFor="checkout-note"
          error={errors.note?.message}
          className="sm:col-span-2"
        >
          <Textarea placeholder="Ví dụ: giao giờ hành chính, gọi trước khi giao..." {...register("note")} />
        </Field>
      </div>
    </CheckoutCard>
  )
}

export { ShippingCard }
