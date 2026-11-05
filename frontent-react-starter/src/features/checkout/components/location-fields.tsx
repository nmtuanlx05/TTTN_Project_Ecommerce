import { useWatch, type UseFormReturn } from "react-hook-form"
import type { UseQueryResult } from "@tanstack/react-query"
import type { ApiError } from "@/lib/api-error"
import { useDistricts, useProvinces } from "../queries"
import type { CheckoutFormValues } from "../schemas"
import type { LocationItem } from "../types"
import { LocationSelect } from "./location-select"

/**
 * Ba ô địa chỉ 3 cấp (chuẩn cũ), các ô lưới do `ShippingCard` sắp: [Tỉnh | Quận/huyện], [Phường/xã | ...]. Đổi tỉnh xóa quận và phường; đổi quận xóa phường.
 * Quận/huyện không có phường/xã (5 huyện đảo): ô phường khóa, "Không có phường/xã", không bắt buộc.
 */
function LocationFields({
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
  const provinceCode = useWatch({ control: form.control, name: "provinceCode" })
  const districtCode = useWatch({ control: form.control, name: "districtCode" })
  const provinces = useProvinces()
  const districts = useDistricts(provinceCode)
  const noWards = districtCode !== "" && wards.isSuccess && !hasWards

  return (
    <>
      <LocationSelect
        control={form.control}
        name="provinceCode"
        label="Tỉnh / Thành phố"
        query={provinces}
        required
        placeholder="Chọn tỉnh / thành phố"
        onChange={(code) => {
          form.setValue("provinceCode", code, { shouldValidate: form.formState.isSubmitted })
          onDistrictChange("")
        }}
      />
      <LocationSelect
        control={form.control}
        name="districtCode"
        label="Quận / Huyện"
        query={districts}
        required
        disabled={provinceCode === ""}
        placeholder="Chọn quận / huyện"
        onChange={onDistrictChange}
      />
      <LocationSelect
        control={form.control}
        name="wardCode"
        label="Phường / Xã"
        query={wards}
        required={!noWards}
        disabled={districtCode === "" || noWards}
        placeholder={noWards ? "Không có phường/xã" : "Chọn phường / xã"}
        onChange={(code) => form.setValue("wardCode", code, { shouldValidate: form.formState.isSubmitted })}
      />
    </>
  )
}

export { LocationFields }
