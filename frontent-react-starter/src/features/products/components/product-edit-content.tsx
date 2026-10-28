import { useState } from "react"
import type { UseFormReturn } from "react-hook-form"
import { useNavigate } from "react-router-dom"
import { PageHeader } from "@/components/admin/page-header"
import { Button } from "@/components/ui/button"
import { useToast } from "@/components/ui/toast"
import { formatDateTime } from "@/lib/format"
import { buildUpdateInput, toFormValues } from "../form-mapping"
import { useListPath } from "../list-link"
import { useUpdateProduct } from "../queries"
import type { ProductFormValues } from "../schemas"
import type { ProductDetail } from "../types"
import { useProductFormErrors } from "../use-product-form-errors"
import { useProductStatusAction } from "../use-product-status-action"
import { ProductBackLink } from "./product-back-link"
import { ProductForm } from "./product-form"
import { ProductStatusDialog } from "./product-status-dialog"
import { ProductVisibility } from "./product-visibility"

/**
 * Trang sửa sau khi đã có chi tiết. `product` là bản mới nhất từ query (dùng cho tiêu đề và nút ẩn/hiện);
 * `baseline` là bản đã lưu mà form đang so sánh, chỉ đổi sau khi lưu thành công, nên đổi trạng thái
 * hay refetch giữa chừng không làm mất chỉnh sửa đang dở.
 */
function ProductEditContent({ product }: { product: ProductDetail }) {
  const update = useUpdateProduct()
  const status = useProductStatusAction()
  const toast = useToast()
  const navigate = useNavigate()
  const listPath = useListPath()
  const errors = useProductFormErrors()
  const [baseline, setBaseline] = useState(product)
  const [initialValues] = useState(() => toFormValues(product))

  function submit(values: ProductFormValues, form: UseFormReturn<ProductFormValues>) {
    errors.clear()
    const { input, rowIndexes } = buildUpdateInput(baseline, values)
    if (Object.keys(input).length === 0) {
      form.reset(toFormValues(baseline))
      return
    }
    update.mutate(
      { id: baseline.id, input },
      {
        onSuccess: (saved) => {
          setBaseline(saved)
          form.reset(toFormValues(saved))
          toast.add({
            title: "Đã lưu thay đổi",
            description: saved.name,
            data: { tone: "success" },
          })
        },
        onError: (error) => {
          if (error.statusCode === 404) {
            toast.add({
              title: "Không tìm thấy sản phẩm này",
              description: "Sản phẩm có thể đã bị xóa. Danh sách đã được làm mới.",
              data: { tone: "danger" },
            })
            navigate(listPath, { replace: true })
            return
          }
          errors.handle(error, form, rowIndexes)
        },
      },
    )
  }

  return (
    <div className="flex flex-col gap-section">
      <ProductBackLink />
      <PageHeader
        title={product.name}
        description={`Cập nhật lần cuối ${formatDateTime(product.updatedAt)}.`}
        actions={
          <div className="flex flex-wrap items-center gap-inline">
            <ProductVisibility isActive={product.isActive} />
            <Button
              variant="secondary"
              loading={status.pendingId === product.id}
              onClick={() => status.request(product)}
            >
              {product.isActive ? "Ẩn sản phẩm" : "Hiện lại sản phẩm"}
            </Button>
          </div>
        }
      />
      <ProductForm
        mode="edit"
        initialValues={initialValues}
        savedVariants={baseline.variants}
        busy={update.isPending}
        formError={errors.formError}
        onCancel={() => navigate(listPath)}
        onSubmit={submit}
      />
      <ProductStatusDialog {...status.dialogProps} />
    </div>
  )
}

export { ProductEditContent }
