import type { PublicCategory } from "./types"

export interface ParentOption {
  value: number
  /** Đường dẫn từ gốc, vd. "Áo › Áo thun", để phân biệt các danh mục trùng tên ở cấp khác nhau. */
  label: string
}

const PATH_SEPARATOR = " › "

/** id của `rootId` và toàn bộ con cháu (đi theo `parentId`). */
function collectSelfAndDescendants(
  categories: PublicCategory[],
  rootId: number,
): Set<number> {
  const childrenOf = new Map<number, number[]>()
  for (const category of categories) {
    if (category.parentId === null) continue
    const siblings = childrenOf.get(category.parentId) ?? []
    siblings.push(category.id)
    childrenOf.set(category.parentId, siblings)
  }

  const result = new Set<number>([rootId])
  const queue = [rootId]
  while (queue.length > 0) {
    const current = queue.pop() as number
    for (const childId of childrenOf.get(current) ?? []) {
      if (!result.has(childId)) {
        result.add(childId)
        queue.push(childId)
      }
    }
  }
  return result
}

/**
 * Các danh mục có thể chọn làm cha, sắp theo đường dẫn. Khi sửa danh mục `editingId` thì
 * loại chính nó và con cháu của nó (chọn chúng làm cha sẽ tạo vòng lặp; backend cũng chặn, 400).
 */
export function buildParentOptions(
  categories: PublicCategory[],
  editingId?: number,
): ParentOption[] {
  const byId = new Map(categories.map((category) => [category.id, category]))
  const excluded =
    editingId === undefined ? new Set<number>() : collectSelfAndDescendants(categories, editingId)

  function pathOf(category: PublicCategory): string {
    const names = [category.name]
    const seen = new Set<number>([category.id])
    let parent = category.parentId === null ? undefined : byId.get(category.parentId)
    while (parent && !seen.has(parent.id)) {
      names.unshift(parent.name)
      seen.add(parent.id)
      parent = parent.parentId === null ? undefined : byId.get(parent.parentId)
    }
    return names.join(PATH_SEPARATOR)
  }

  return categories
    .filter((category) => !excluded.has(category.id))
    .map((category) => ({ value: category.id, label: pathOf(category) }))
    .sort((a, b) => a.label.localeCompare(b.label, "vi"))
}
