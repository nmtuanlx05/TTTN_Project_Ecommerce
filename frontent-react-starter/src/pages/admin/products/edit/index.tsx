import { useParams } from "react-router-dom"
import { ProductEditView } from "@/features/products/components/product-edit-view"

function ProductEditPage() {
  const { id } = useParams()
  return <ProductEditView rawId={id} />
}

export default ProductEditPage
