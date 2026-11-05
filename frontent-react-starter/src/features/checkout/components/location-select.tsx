import type { UseQueryResult } from "@tanstack/react-query"
import { Controller, type Control } from "react-hook-form"
import { SearchSelect } from "@/components/shared/search-select"
import { Field } from "@/components/ui/field"
import type { ApiError } from "@/lib/api-error"
import type { CheckoutFormValues } from "../schemas"
import type { LocationItem } from "../types"

/** Một ô địa chỉ (tỉnh, quận hoặc phường): danh sách từ query, có "Đang tải…" và "Thử lại" khi lỗi. `disabledText` thay chữ gợi ý khi ô bị khóa. */
function LocationSelect({
  control,
  name,
  label,
  query,
  required,
  disabled,
  placeholder,
  onChange,
}: {
  control: Control<CheckoutFormValues>
  name: "provinceCode" | "districtCode" | "wardCode"
  label: string
  query: UseQueryResult<LocationItem[], ApiError>
  required?: boolean
  disabled?: boolean
  placeholder: string
  onChange: (code: string) => void
}) {
  const loading = query.isFetching && !query.data
  return (
    <Controller
      control={control}
      name={name}
      render={({ field, fieldState }) => (
        <div className="flex flex-col gap-1.5">
          <Field label={label} htmlFor={`checkout-${name}`} error={fieldState.error?.message} required={required}>
            <SearchSelect
              options={(query.data ?? []).map((item) => ({ value: item.code, label: item.name }))}
              value={field.value}
              onValueChange={onChange}
              disabled={disabled || loading}
              placeholder={loading ? "Đang tải..." : placeholder}
            />
          </Field>
          {query.isError ? (
            <p className="text-caption text-danger-fg">
              Không tải được danh sách.{" "}
              <button type="button" onClick={() => void query.refetch()} className="underline underline-offset-4">
                Thử lại
              </button>
            </p>
          ) : null}
        </div>
      )}
    />
  )
}

export { LocationSelect }
