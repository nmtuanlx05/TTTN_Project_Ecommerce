import { RotateCw } from "lucide-react"
import { Alert } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import { useProduct } from "../queries"
import { ProductBackLink } from "./product-back-link"
import { ProductEditContent } from "./product-edit-content"
import { ProductFormSkeleton } from "./product-form-skeleton"
import { ProductNotFound } from "./product-not-found"

/** Trang sửa: tải chi tiết rồi chọn skeleton, lỗi (kèm thử lại), không tìm thấy hoặc form. */
function ProductEditView({ rawId }: { rawId: string | undefined }) {
  const id = Number(rawId)
  const validId = Number.isInteger(id) && id >= 1
  // Id sai (không phải số nguyên dương) thì không gọi API, vì backend sẽ trả 400 "ID không hợp lệ".
  return validId ? <ProductEditLoader id={id} /> : <ProductNotFound />
}

function ProductEditLoader({ id }: { id: number }) {
  const { data, error, isPending, isError, isFetching, refetch } = useProduct(id)

  if (isPending) {
    return (
      <div className="flex flex-col gap-section">
        <ProductBackLink />
        <ProductFormSkeleton />
      </div>
    )
  }

  if (isError) {
    if (error.statusCode === 404) return <ProductNotFound />
    return (
      <div className="flex flex-col gap-section">
        <ProductBackLink />
        <Alert variant="danger" title="Không tải được sản phẩm">
          <p>{error.message}</p>
          <Button
            variant="secondary"
            size="sm"
            className="mt-2"
            loading={isFetching}
            onClick={() => refetch()}
          >
            <RotateCw />
            Thử lại
          </Button>
        </Alert>
      </div>
    )
  }

  // key theo id: sang sản phẩm khác thì form được tạo lại từ đầu.
  return <ProductEditContent key={data.id} product={data} />
}

export { ProductEditView }
