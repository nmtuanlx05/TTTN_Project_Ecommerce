import { Controller, useFormContext } from "react-hook-form"
import { Field } from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import type { ProductFormValues } from "../schemas"
import { CategorySelect } from "./category-select"
import { FormSection } from "./form-section"
import { ProductPriceField } from "./product-price-field"

const SLUG_HINT_CREATE =
  "Bỏ trống để hệ thống tự tạo từ tên. Chỉ gồm chữ thường không dấu, số và dấu gạch ngang."
const SLUG_HINT_EDIT =
  "Nhập slug, hoặc giữ nguyên slug cũ. Đổi tên không tự đổi slug, để đường dẫn ổn định."

/** Tên, slug, danh mục, giá và mô tả. */
function ProductBasicFields({ mode, idPrefix }: { mode: "create" | "edit"; idPrefix: string }) {
  const {
    register,
    control,
    formState: { errors },
  } = useFormContext<ProductFormValues>()

  return (
    <FormSection title="Thông tin cơ bản">
      <Field label="Tên sản phẩm" htmlFor={`${idPrefix}-name`} required error={errors.name?.message}>
        <Input autoComplete="off" {...register("name")} />
      </Field>

      <Field
        label="Slug"
        htmlFor={`${idPrefix}-slug`}
        required={mode === "edit"}
        error={errors.slug?.message}
        description={mode === "create" ? SLUG_HINT_CREATE : SLUG_HINT_EDIT}
      >
        <Input autoComplete="off" spellCheck={false} className="font-mono" {...register("slug")} />
      </Field>

      <Controller
        control={control}
        name="categoryId"
        render={({ field, fieldState }) => (
          <Field
            label="Danh mục"
            htmlFor={`${idPrefix}-category`}
            required
            error={fieldState.error?.message}
            description="Sản phẩm thuộc đúng một danh mục."
          >
            <CategorySelect value={field.value} onChange={field.onChange} onBlur={field.onBlur} />
          </Field>
        )}
      />

      <ProductPriceField id={`${idPrefix}-price`} />

      <Field label="Mô tả" htmlFor={`${idPrefix}-description`} error={errors.description?.message}>
        <Textarea rows={5} {...register("description")} />
      </Field>
    </FormSection>
  )
}

export { ProductBasicFields }
