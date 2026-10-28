import { useEffect, useId, useRef } from "react"
import { zodResolver } from "@hookform/resolvers/zod"
import { FormProvider, useForm, type UseFormReturn } from "react-hook-form"
import { Alert } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import {
  createProductSchema,
  updateProductSchema,
  type ProductFormValues,
} from "../schemas"
import type { ProductVariant } from "../types"
import { ProductBasicFields } from "./product-basic-fields"
import { ProductImageField } from "./product-image-field"
import { FormSection } from "./form-section"
import { ProductVariantsField } from "./product-variants-field"

/**
 * Form dùng chung cho tạo và sửa sản phẩm. Mutation nằm ở view cha; form chỉ giữ state ô nhập và
 * trao `form` (để cha gắn lỗi server vào ô, `reset` sau khi lưu). `formError` là lỗi của server không
 * gắn được vào ô nào (409 trùng slug/SKU/size-màu…), hiện nguyên văn ở đầu form và được focus.
 */
function ProductForm({
  mode,
  initialValues,
  savedVariants,
  busy,
  formError,
  onCancel,
  onSubmit,
}: {
  mode: "create" | "edit"
  initialValues: ProductFormValues
  /** Biến thể đã lưu (chỉ khi sửa), để hiện tồn kho chỉ đọc. */
  savedVariants: ProductVariant[]
  busy: boolean
  formError: string | null
  onCancel: () => void
  onSubmit: (values: ProductFormValues, form: UseFormReturn<ProductFormValues>) => void
}) {
  const idPrefix = useId()
  const form = useForm<ProductFormValues>({
    resolver: zodResolver(mode === "create" ? createProductSchema : updateProductSchema),
    defaultValues: initialValues,
  })
  const alertRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!formError) return
    alertRef.current?.scrollIntoView({ block: "nearest" })
    alertRef.current?.focus()
  }, [formError])

  return (
    <FormProvider {...form}>
      <form
        noValidate
        onSubmit={form.handleSubmit((values) => onSubmit(values, form))}
        className="flex flex-col gap-section"
      >
        {formError ? (
          <Alert ref={alertRef} tabIndex={-1} variant="danger" className="outline-none">
            {formError}
          </Alert>
        ) : null}

        <ProductBasicFields mode={mode} idPrefix={`${idPrefix}-basic`} />

        <FormSection title="Ảnh">
          <ProductImageField id={`${idPrefix}-image`} />
        </FormSection>

        <ProductVariantsField
          mode={mode}
          idPrefix={`${idPrefix}-variant`}
          savedVariants={savedVariants}
        />

        <div className="flex flex-col-reverse gap-inline sm:flex-row sm:justify-end">
          <Button type="button" variant="secondary" disabled={busy} onClick={onCancel}>
            {mode === "create" ? "Hủy bỏ" : "Về danh sách"}
          </Button>
          <Button type="submit" loading={busy} disabled={mode === "edit" && !form.formState.isDirty}>
            {mode === "create" ? "Thêm sản phẩm" : "Lưu thay đổi"}
          </Button>
        </div>
      </form>
    </FormProvider>
  )
}

export { ProductForm }
