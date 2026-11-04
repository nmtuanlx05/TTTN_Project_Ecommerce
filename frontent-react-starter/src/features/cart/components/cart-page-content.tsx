import { useEffect, useRef, useState } from "react"
import { Link } from "react-router-dom"
import { PageContainer } from "@/components/storefront/page-container"
import { Button, buttonVariants } from "@/components/ui/button"
import { useDocumentTitle } from "@/hooks/use-document-title"
import { useCart, useRefreshCart } from "../queries"
import { CartLineList } from "./cart-line-list"
import { CartEmpty, CartError, CartSkeleton } from "./cart-states"
import { CartSummary } from "./cart-summary"
import { ClearCartConfirm } from "./clear-cart-confirm"

/**
 * Trang /gio-hang cho CUSTOMER (trang bọc route đã kiểm quyền): trái danh sách dòng (dùng chung `CartLine` với ngăn kéo, rộng hơn), phải thẻ tóm tắt; dưới `lg` xếp dọc.
 * Vào trang thì làm mới giỏ nền (đã có cache thì hiện luôn, không khung chờ). "Xoá tất cả" có xác nhận.
 */
function CartPageContent() {
  const { data: cart, isError, refetch } = useCart({ enabled: true })
  const refresh = useRefreshCart()
  const [confirmOpen, setConfirmOpen] = useState(false)
  const [announcement, setAnnouncement] = useState("")
  const headingRef = useRef<HTMLHeadingElement>(null)
  useDocumentTitle("Giỏ hàng")

  useEffect(() => {
    refresh()
  }, [refresh])

  let body
  if (cart && cart.items.length > 0) {
    body = (
      <div className="grid gap-8 lg:grid-cols-12 lg:gap-12">
        <div className="lg:col-span-8">
          <div className="mb-2 flex justify-end">
            <Button type="button" variant="ghost" onClick={() => setConfirmOpen(true)} className="press text-ink-muted">
              Xoá tất cả
            </Button>
          </div>
          <CartLineList items={cart.items} unavailableCount={cart.unavailableCount} size="lg" onAnnounce={setAnnouncement} />
        </div>
        <div className="lg:col-span-4">
          <CartSummary cart={cart} />
        </div>
      </div>
    )
  } else if (cart) {
    body = (
      <CartEmpty
        action={
          <Link to="/products" className={buttonVariants()}>
            Tiếp tục mua sắm
          </Link>
        }
      />
    )
  } else if (isError) {
    body = <CartError onRetry={() => void refetch()} />
  } else {
    body = <CartSkeleton />
  }

  return (
    <PageContainer className="pt-8 pb-block lg:pt-16">
      <h1 ref={headingRef} tabIndex={-1} className="mb-8 text-h1 text-ink uppercase outline-none">
        Giỏ hàng{cart && cart.itemCount > 0 ? ` (${cart.itemCount})` : ""}
      </h1>
      {body}
      <ClearCartConfirm
        open={confirmOpen}
        onOpenChange={setConfirmOpen}
        returnFocusTo={headingRef}
        onCleared={() => setAnnouncement("Đã xóa tất cả sản phẩm khỏi giỏ hàng")}
      />
      <p role="status" aria-live="polite" className="sr-only">
        {announcement}
      </p>
    </PageContainer>
  )
}

export { CartPageContent }
