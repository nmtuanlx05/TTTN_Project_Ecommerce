import { useLocation } from "react-router-dom"

const LIST_PATH = "/admin/orders"

/** State đi kèm link từ danh sách sang chi tiết: giữ query để "Quay lại" về đúng bộ lọc và trang. */
export function listLinkState(search: string) {
  return { listSearch: search }
}

/** Đường dẫn về danh sách kèm lại `?status=&page=…`; chỉ nhận chuỗi bắt đầu bằng `?` vì state không đáng tin. */
export function useListPath(): string {
  const state: unknown = useLocation().state
  const search =
    typeof state === "object" && state !== null && "listSearch" in state
      ? (state as { listSearch: unknown }).listSearch
      : ""
  return typeof search === "string" && search.startsWith("?") ? `${LIST_PATH}${search}` : LIST_PATH
}
