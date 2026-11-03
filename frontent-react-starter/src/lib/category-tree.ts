import type { PublicCategory } from "@/types/category"

export interface CategoryNode extends PublicCategory {
  children: CategoryNode[]
  /** 0 = gốc. */
  depth: number
}

export interface CategoryTree {
  roots: CategoryNode[]
  bySlug: Map<string, CategoryNode>
  byId: Map<number, CategoryNode>
}

/**
 * Danh mục phẳng (`parentId`) → cây. Anh em sắp theo tên (tiếng Việt). Danh mục có cha không tồn
 * tại được coi là gốc; nhánh có vòng lặp không với tới được từ gốc nên bị bỏ (không treo).
 */
export function buildCategoryTree(categories: PublicCategory[]): CategoryTree {
  const ids = new Set(categories.map((category) => category.id))
  const childrenOf = new Map<number | null, PublicCategory[]>()
  for (const category of categories) {
    const parentKey =
      category.parentId !== null && ids.has(category.parentId) ? category.parentId : null
    const siblings = childrenOf.get(parentKey) ?? []
    siblings.push(category)
    childrenOf.set(parentKey, siblings)
  }

  const bySlug = new Map<string, CategoryNode>()
  const byId = new Map<number, CategoryNode>()

  function build(parentKey: number | null, depth: number): CategoryNode[] {
    const siblings = [...(childrenOf.get(parentKey) ?? [])].sort((a, b) =>
      a.name.localeCompare(b.name, "vi"),
    )
    return siblings.flatMap((category) => {
      if (byId.has(category.id)) return []
      const node: CategoryNode = { ...category, children: [], depth }
      byId.set(node.id, node)
      bySlug.set(node.slug, node)
      node.children = build(node.id, depth + 1)
      return [node]
    })
  }

  return { roots: build(null, 0), bySlug, byId }
}

/** Chuỗi từ gốc tới danh mục `id` (gồm chính nó). Rỗng nếu `id` không có trong cây. */
export function categoryTrail(tree: CategoryTree, id: number): CategoryNode[] {
  const trail: CategoryNode[] = []
  const seen = new Set<number>()
  let current = tree.byId.get(id)
  while (current && !seen.has(current.id)) {
    seen.add(current.id)
    trail.unshift(current)
    current = current.parentId === null ? undefined : tree.byId.get(current.parentId)
  }
  return trail
}

/** `slug` là của chính `node` hoặc của một danh mục con/cháu bất kỳ của nó. */
export function containsSlug(node: CategoryNode, slug: string): boolean {
  return node.slug === slug || node.children.some((child) => containsSlug(child, slug))
}
