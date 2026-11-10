import { useMemo, useState } from "react"
import { zodResolver } from "@hookform/resolvers/zod"
import { useQueryClient } from "@tanstack/react-query"
import { useForm, useWatch } from "react-hook-form"
import { useNavigate } from "react-router-dom"
import { applyServerErrors } from "@/lib/form-errors"
import { orderPaymentPath } from "@/lib/order-paths"
import { classifyPlaceOrderError } from "./checkout-errors"
import { newIdempotencyKey } from "./idempotency"
import { buildCheckoutSchema, CHECKOUT_FIELDS, normalizePhone, type CheckoutFormValues } from "./schemas"
import { usePlaceOrder, useWards } from "./queries"
import type { PaymentMethod } from "./types"

interface Options {
  user: { name: string | null; phone: string | null }
  /** ONLINE có đang dùng được không (`availablePaymentMethods.online.enabled` của xem trước). Tắt thì phương thức chọn tự về COD. */
  onlineEnabled: boolean
  /** Mã voucher đang áp dụng (đã được xem trước thành công). */
  appliedCode: string | null
  /** Đặt đơn báo mã voucher không còn dùng được: nơi gọi hiện lỗi dưới ô mã và gỡ mã. */
  onVoucherFailure: (message: string) => void
  /** Đặt đơn xong và đã chuyển trang: nơi gọi làm mới giỏ (features/checkout không biết giỏ). */
  onPlaced: () => void
}

/**
 * Form thanh toán: RHF + zod (schema dựng lại theo `hasWards`), địa chỉ phụ thuộc nhau, đặt đơn với `Idempotency-Key` (một khóa cho mỗi lần vào trang,
 * dùng lại khi thử lại), và ánh xạ lỗi của backend về đúng ô/banner. Không xóa dữ liệu đã điền khi lỗi.
 */
export function useCheckoutForm({ user, onlineEnabled, appliedCode, onVoucherFailure, onPlaced }: Options) {
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const [idempotencyKey] = useState(newIdempotencyKey)
  const [formError, setFormError] = useState<string | null>(null)
  const [unavailable, setUnavailable] = useState<string[]>([])
  const place = usePlaceOrder()

  const [districtCode, setDistrictCode] = useState("")
  const wards = useWards(districtCode)
  const hasWards = (wards.data?.length ?? 0) > 0
  const resolver = useMemo(() => zodResolver(buildCheckoutSchema(hasWards)), [hasWards])

  const form = useForm<CheckoutFormValues>({
    resolver,
    defaultValues: {
      receiverName: user.name ?? "",
      phone: normalizePhone(user.phone),
      provinceCode: "",
      districtCode: "",
      wardCode: "",
      addressLine: "",
      note: "",
      paymentMethod: "COD",
    },
  })
  // Phương thức thực sự gửi đi: ONLINE chỉ khi còn dùng được (đổi voucher làm tổng về 0đ, hoặc cấu hình tắt thì tự về COD, thẻ ONLINE hiện lý do).
  const chosenMethod = useWatch({ control: form.control, name: "paymentMethod" })
  const paymentMethod: PaymentMethod = chosenMethod === "ONLINE" && onlineEnabled ? "ONLINE" : "COD"

  // Quận/huyện đã chọn nhưng chưa biết có phường/xã hay không (đang tải hoặc lỗi): chưa cho đặt, để khỏi bỏ sót `wardCode`.
  const wardsReady = districtCode === "" || wards.isSuccess

  const onSubmit = (values: CheckoutFormValues) => {
    if (place.isPending) return
    setFormError(null)
    setUnavailable([])
    const input = {
      receiverName: values.receiverName,
      phone: values.phone,
      provinceCode: values.provinceCode,
      districtCode: values.districtCode,
      wardCode: hasWards ? values.wardCode : undefined,
      addressLine: values.addressLine,
      note: values.note || undefined,
      paymentMethod,
      voucherCode: appliedCode ?? undefined,
    }
    place.mutate(
      { input, idempotencyKey },
      {
        onSuccess: (order) => {
          const target =
            order.paymentMethod === "ONLINE"
              ? orderPaymentPath(order.code)
              : `/dat-hang-thanh-cong/${encodeURIComponent(order.code)}`
          navigate(target, { replace: true })
          onPlaced()
        },
        onError: (error) => {
          const failure = classifyPlaceOrderError(error)
          switch (failure.kind) {
            case "cart-empty":
              navigate("/gio-hang", { replace: true })
              return
            case "unavailable":
              setUnavailable(failure.messages)
              void queryClient.invalidateQueries({ queryKey: ["checkout", "preview"] })
              return
            case "voucher":
              onVoucherFailure(failure.message)
              return
            case "field":
              form.setError(failure.field, { message: failure.message }, { shouldFocus: true })
              return
            case "payment":
              // ONLINE bị từ chối (tắt hoặc tổng 0đ): về COD, tải lại xem trước để thẻ ONLINE hiện đúng lý do mới.
              form.setValue("paymentMethod", "COD")
              setFormError(failure.message)
              void queryClient.invalidateQueries({ queryKey: ["checkout", "preview"] })
              return
            case "busy":
              setFormError(failure.message)
              return
            case "general": {
              if (error.errors.length === 0) {
                setFormError(failure.message)
                return
              }
              const general = applyServerErrors(error, form.setError, CHECKOUT_FIELDS)
              if (general) setFormError(general)
            }
          }
        },
      },
    )
  }

  return {
    form,
    submit: form.handleSubmit(onSubmit),
    pending: place.isPending,
    formError,
    unavailable,
    wards,
    wardsReady,
    hasWards,
    paymentMethod,
    setPaymentMethod: (method: PaymentMethod) => form.setValue("paymentMethod", method),
    changeDistrict: (code: string) => {
      setDistrictCode(code)
      form.setValue("districtCode", code, { shouldValidate: form.formState.isSubmitted })
      form.setValue("wardCode", "")
      form.clearErrors("wardCode")
    },
  }
}
