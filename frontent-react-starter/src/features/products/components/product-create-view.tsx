import { useState } from "react"
import { useNavigate } from "react-router-dom"
import { PageHeader } from "@/components/admin/page-header"
import { useToast } from "@/components/ui/toast"
import { buildCreateInput, emptyFormValues } from "../form-mapping"
import { useListPath } from "../list-link"
import { useCreateProduct } from "../queries"
import type { ProductFormValues } from "../schemas"
import { useProductFormErrors } from "../use-product-form-errors"
import { ProductBackLink } from "./product-back-link"
import { ProductForm } from "./product-form"
import type { UseFormReturn } from "react-hook-form"

/** Trang thêm sản phẩm: thành công thì báo bằng toast rồi về danh sách. */
function ProductCreateView() {
  const create = useCreateProduct()
  const toast = useToast()
  const navigate = useNavigate()
  const listPath = useListPath()
  const errors = useProductFormErrors()
  const [initialValues] = useState(emptyFormValues)

  function submit(values: ProductFormValues, form: UseFormReturn<ProductFormValues>) {
    errors.clear()
    create.mutate(buildCreateInput(values), {
      onSuccess: (created) => {
        toast.add({
          title: "Đã thêm sản phẩm",
          description: created.name,
          data: { tone: "success" },
        })
        navigate(listPath, { replace: true })
      },
      onError: (error) => errors.handle(error, form),
    })
  }

  return (
    <div className="flex flex-col gap-section">
      <ProductBackLink />
      <PageHeader
        title="Thêm sản phẩm"
        description="Nhập thông tin sản phẩm và các biến thể size, màu. Sản phẩm mới hiện ngay trên cửa hàng khi có biến thể còn hàng."
      />
      <ProductForm
        mode="create"
        initialValues={initialValues}
        savedVariants={[]}
        busy={create.isPending}
        formError={errors.formError}
        onCancel={() => navigate(listPath)}
        onSubmit={submit}
      />
    </div>
  )
}

export { ProductCreateView }
