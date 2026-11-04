import type { ComponentPropsWithoutRef } from "react"
import { cn } from "@/lib/utils"

/**
 * Khung nội dung của trang storefront: rộng tối đa `max-w-7xl` (80rem = `--container-max` ở global.css), căn giữa, lề hai bên `px-gutter`.
 * Một nguồn duy nhất cho các trang. CHÚ Ý: header (`storefront-header`), chân trang (`storefront-footer`), khung tìm kiếm (`search-panel`) và
 * bảng điều hướng (`header-nav-panel`) cũng dùng đúng giá trị này (`max-w-7xl` + `px-gutter`) nhưng tự viết class; đổi bề rộng hay gutter ở đây thì
 * phải đổi cả bốn nơi đó, và `--container-max` / `--container-inset` ở global.css (cột chữ của hero canh theo chúng), để mép trái không lệch.
 */
function PageContainer({ className, ...props }: ComponentPropsWithoutRef<"div">) {
  return <div className={cn("mx-auto w-full max-w-7xl px-gutter", className)} {...props} />
}

export { PageContainer }
