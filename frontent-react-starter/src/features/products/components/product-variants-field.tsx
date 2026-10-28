import { useRef } from "react"
import { Plus } from "lucide-react"
import { useFieldArray, useFormContext } from "react-hook-form"
import { Button } from "@/components/ui/button"
import { EMPTY_VARIANT } from "../form-mapping"
import { MAX_VARIANTS } from "../constants"
import type { ProductFormValues } from "../schemas"
import type { ProductVariant } from "../types"
import { FormSection } from "./form-section"
import { ProductVariantRow } from "./product-variant-row"

/** Danh sách biến thể (size × màu). Biến thể đã lưu không bao giờ bị xóa, chỉ sửa hoặc ngừng bán. */
function ProductVariantsField({
  mode,
  idPrefix,
  savedVariants,
}: {
  mode: "create" | "edit"
  idPrefix: string
  savedVariants: ProductVariant[]
}) {
  const {
    control,
    formState: { errors },
  } = useFormContext<ProductFormValues>()
  // `keyName` khác "id": biến thể có trường `id` thật (id trong DB), RHF mặc định sẽ ghi đè nó.
  const { fields, append, remove } = useFieldArray({ control, name: "variants", keyName: "fieldKey" })
  const addButton = useRef<HTMLButtonElement>(null)
  const savedById = new Map(savedVariants.map((variant) => [variant.id, variant]))
  const listError = errors.variants?.root?.message ?? errors.variants?.message

  return (
    <FormSection
      title="Biến thể"
      description={
        mode === "create"
          ? "Mỗi biến thể là một cặp size và màu có SKU riêng. Cần ít nhất 1 biến thể. Tồn kho bắt đầu từ 0, nhập kho ở module Kho."
          : "Biến thể đã lưu không xóa được, chỉ sửa hoặc ngừng bán. Tồn kho chỉ xem ở đây, nhập kho ở module Kho."
      }
    >
      {listError ? (
        <p role="alert" className="text-body-sm text-danger-fg">
          {listError}
        </p>
      ) : null}

      <ul className="flex flex-col gap-stack">
        {fields.map((field, index) => {
          const saved = field.id === undefined ? undefined : savedById.get(field.id)
          return (
            <ProductVariantRow
              key={field.fieldKey}
              index={index}
              idPrefix={idPrefix}
              saved={saved}
              canRemove={mode === "edit" || fields.length > 1}
              onRemove={() => {
                remove(index)
                addButton.current?.focus()
              }}
            />
          )
        })}
      </ul>

      <Button
        ref={addButton}
        type="button"
        variant="secondary"
        className="w-fit"
        disabled={fields.length >= MAX_VARIANTS}
        onClick={() => append({ ...EMPTY_VARIANT })}
      >
        <Plus />
        Thêm biến thể
      </Button>
    </FormSection>
  )
}

export { ProductVariantsField }
