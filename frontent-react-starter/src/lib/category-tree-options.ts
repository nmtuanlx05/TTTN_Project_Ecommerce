import type { PublicCategory } from "@/types/category"

export interface CategoryTreeOption {
  value: number
  name: string
  /** Độ sâu trong cây (0 = gốc), dùng để thụt lề trong danh sách chọn. */
  depth: number
  /** Đường dẫn từ gốc, vd. "Áo › Áo thun": nhãn ngắn gọn cho ô đã chọn. */
  path: string
}

const PATH_SEPARATOR = " › "

/**
 * Danh mục phẳng (`parentId`) → danh sách theo thứ tự cây (cha đứng trước con, anh em sắp theo tên),
 * mỗi mục có độ sâu để thụt lề. Danh mục có cha không tồn tại được coi là gốc; có vòng lặp thì
 * mỗi danh mục vẫn chỉ xuất hiện một lần.
 */
export function buildCategoryTreeOptions(categories: PublicCategory[]): CategoryTreeOption[] {
  const ids = new Set(categories.map((category) => category.id))
  const childrenOf = new Map<number | null, PublicCategory[]>()
  for (const category of categories) {
    const parentKey =
      category.parentId !== null && ids.has(category.parentId) ? category.parentId : null
    const siblings = childrenOf.get(parentKey) ?? []
    siblings.push(category)
    childrenOf.set(parentKey, siblings)
  }

  const result: CategoryTreeOption[] = []
  const visited = new Set<number>()

  function walk(parentKey: number | null, depth: number, parentPath: string) {
    const siblings = [...(childrenOf.get(parentKey) ?? [])].sort((a, b) =>
      a.name.localeCompare(b.name, "vi"),
    )
    for (const category of siblings) {
      if (visited.has(category.id)) continue
      visited.add(category.id)
      const path = parentPath ? `${parentPath}${PATH_SEPARATOR}${category.name}` : category.name
      result.push({ value: category.id, name: category.name, depth, path })
      walk(category.id, depth + 1, path)
    }
  }

  walk(null, 0, "")
  return result
}
