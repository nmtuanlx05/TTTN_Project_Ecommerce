import { useLocation } from "react-router-dom"

const LIST_PATH = "/admin/products"

/** State đi kèm link từ danh sách sang trang tạo/sửa: giữ query để "Quay lại" về đúng bộ lọc và trang. */
export interface ListLinkState {
  listSearch: string
}

export function listLinkState(search: string): ListLinkState {
  return { listSearch: search }
}

/**
 * Đường dẫn về danh sách, kèm lại `?q=&page=…` nếu người dùng đến từ danh sách. State có thể bị
 * sửa hoặc thiếu (mở link trực tiếp, F5 vẫn giữ nhưng không đáng tin), nên chỉ nhận chuỗi bắt đầu bằng `?`.
 */
export function useListPath(): string {
  const state: unknown = useLocation().state
  const search =
    typeof state === "object" && state !== null && "listSearch" in state
      ? (state as ListLinkState).listSearch
      : ""
  return typeof search === "string" && search.startsWith("?") ? `${LIST_PATH}${search}` : LIST_PATH
}
