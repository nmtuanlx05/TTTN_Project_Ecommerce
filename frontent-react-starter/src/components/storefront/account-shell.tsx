import type { ReactNode } from "react"

/**
 * Hai cột của các trang `/tai-khoan`: thanh bên + nội dung. Từ `lg` thanh bên dính (`sticky top-(--sticky-top)`, cùng mẫu thẻ thông tin trang chi tiết sản phẩm);
 * dưới `lg` một cột, thanh bên thu thành dải gọn phía trên. Không lớp cha nào được đặt `overflow` (sẽ làm hỏng sticky).
 */
function AccountShell({ sidebar, children }: { sidebar: ReactNode; children: ReactNode }) {
  return (
    <div className="grid gap-6 lg:grid-cols-[16rem_minmax(0,1fr)] lg:gap-10">
      <div className="lg:sticky lg:top-(--sticky-top) lg:self-start">{sidebar}</div>
      <div className="min-w-0">{children}</div>
    </div>
  )
}

export { AccountShell }
