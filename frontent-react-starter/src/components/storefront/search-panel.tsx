import { useRef, type FormEvent } from "react"
import { useNavigate, useSearchParams } from "react-router-dom"
import { Search, X } from "lucide-react"
import { Dialog } from "@base-ui/react/dialog"
import { Button } from "@/components/ui/button"
import { useOpenUntilNavigation } from "@/hooks/use-open-until-navigation"
import { StorefrontDrawer } from "./storefront-drawer"

/**
 * Nút tìm kiếm ở header + khung trượt từ trên, toàn chiều rộng. Mở ra tự focus ô nhập; Enter đi tới
 * `/products?q=...` rồi đóng NGAY (kể cả khi đang ở /products mà chỉ query đổi: pathname không đổi nên phải đóng
 * bằng tay); Esc hoặc bấm nền đóng; ô trống thì Enter không làm gì. Focus trả về nút tìm kiếm.
 */
function SearchPanel() {
  const [open, setOpen] = useOpenUntilNavigation()
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const inputRef = useRef<HTMLInputElement>(null)

  function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const keyword = (inputRef.current?.value ?? "").trim()
    if (!keyword) return
    setOpen(false)
    navigate(`/products?q=${encodeURIComponent(keyword)}`)
  }

  return (
    <StorefrontDrawer
      open={open}
      onOpenChange={setOpen}
      side="top"
      title="Tìm kiếm sản phẩm"
      hideHeader
      initialFocus={inputRef}
      trigger={<Button variant="ghost" size="icon" aria-label="Tìm kiếm" className="press" />}
      triggerContent={<Search className="size-5" />}
    >
      <form
        role="search"
        onSubmit={onSubmit}
        className="mx-auto flex w-full max-w-7xl items-center gap-inline px-gutter py-6"
      >
        <label htmlFor="storefront-search" className="sr-only">
          Tìm sản phẩm
        </label>
        <Search className="size-5 shrink-0 text-ink-muted" aria-hidden="true" />
        <input
          id="storefront-search"
          ref={inputRef}
          type="search"
          enterKeyHint="search"
          autoComplete="off"
          defaultValue={searchParams.get("q") ?? ""}
          placeholder="Tìm sản phẩm…"
          className="h-14 min-w-0 flex-1 border-b border-border-control bg-transparent font-display text-h3 text-ink outline-none transition-colors placeholder:text-ink-subtle focus-visible:border-ink"
        />
        <Dialog.Close render={<Button type="button" variant="ghost" size="icon" aria-label="Đóng tìm kiếm" />}>
          <X />
        </Dialog.Close>
      </form>
    </StorefrontDrawer>
  )
}

export { SearchPanel }
