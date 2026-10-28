import { useState } from "react"
import type { UseFormReturn } from "react-hook-form"
import { useToast } from "@/components/ui/toast"
import type { ApiError } from "@/lib/api-error"
import { applyServerErrors } from "@/lib/form-errors"
import { formFieldPaths, remapVariantErrors } from "./form-mapping"
import type { ProductFormValues } from "./schemas"

/**
 * Lỗi khi gửi form sản phẩm: 400 theo ô → vào đúng ô (kể cả ô của biến thể); 403 → toast;
 * còn lại (409 trùng slug/SKU/size-màu, 400 không theo ô, lỗi mạng, 5xx) → `formError`, hiện
 * nguyên văn ở đầu form. 404 do trang sửa tự xử lý vì cần rời trang.
 */
export function useProductFormErrors() {
  const [formError, setFormError] = useState<string | null>(null)
  const toast = useToast()

  function handle(
    error: ApiError,
    form: UseFormReturn<ProductFormValues>,
    /** PATCH: bảng map chỉ số biến thể đã gửi → chỉ số hàng trong form (xem `buildUpdateInput`). */
    rowIndexes?: number[],
  ) {
    if (error.statusCode === 403) {
      toast.add({ title: "Không đủ quyền", description: error.message, data: { tone: "danger" } })
      return
    }

    if (error.statusCode === 400) {
      const mapped = rowIndexes ? remapVariantErrors(error, rowIndexes) : error
      const variantCount = form.getValues("variants").length
      setFormError(applyServerErrors(mapped, form.setError, formFieldPaths(variantCount)))
      return
    }

    setFormError(error.message)
  }

  return { formError, clear: () => setFormError(null), handle }
}
