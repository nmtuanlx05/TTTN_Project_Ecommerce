import type { InfiniteData } from "@tanstack/react-query"
import type { Paginated } from "@/types/api"
import type { WishlistItem } from "./types"

/** Hàm thuần cho cập nhật lạc quan của danh sách (infinite) và mảng ids. */

export type WishlistListData = InfiniteData<Paginated<WishlistItem>, number>

/** Thẻ vừa bị gỡ khỏi cache và vị trí cũ, để hoàn lại đúng chỗ khi gọi API lỗi. */
export interface RemovedCard {
  item: WishlistItem
  pageIndex: number
  index: number
}

export function withoutId(ids: number[], productId: number): number[] {
  return ids.filter((id) => id !== productId)
}

export function withId(ids: number[], productId: number): number[] {
  return ids.includes(productId) ? ids : [productId, ...ids]
}

/** Gỡ thẻ khỏi các trang đã tải (và giảm `meta.total`). Không có thẻ trong cache thì trả nguyên dữ liệu, `removed` là undefined. */
export function removeCard(
  data: WishlistListData,
  productId: number,
): { data: WishlistListData; removed?: RemovedCard } {
  for (let pageIndex = 0; pageIndex < data.pages.length; pageIndex++) {
    const page = data.pages[pageIndex]
    const index = page.items.findIndex((item) => item.id === productId)
    if (index === -1) continue
    const pages = data.pages.map((p, i) =>
      i === pageIndex
        ? { ...p, items: p.items.filter((item) => item.id !== productId), meta: { ...p.meta, total: p.meta.total - 1 } }
        : { ...p, meta: { ...p.meta, total: p.meta.total - 1 } },
    )
    return { data: { ...data, pages }, removed: { item: page.items[index], pageIndex, index } }
  }
  return { data }
}

/** Đặt thẻ đã gỡ về lại chỗ cũ (trang đã bị thay thì thôi, lần làm mới sau sẽ sửa). */
export function restoreCard(data: WishlistListData, removed: RemovedCard): WishlistListData {
  const target = data.pages[removed.pageIndex]
  if (!target || target.items.some((item) => item.id === removed.item.id)) return data
  const pages = data.pages.map((p, i) => {
    const meta = { ...p.meta, total: p.meta.total + 1 }
    if (i !== removed.pageIndex) return { ...p, meta }
    const items = [...p.items]
    items.splice(removed.index, 0, removed.item)
    return { ...p, items, meta }
  })
  return { ...data, pages }
}
