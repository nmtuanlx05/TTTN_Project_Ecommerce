import { useMemo } from "react"
import { useCategoryOptions } from "@/hooks/use-category-options"
import { buildCategoryTree, type CategoryTree } from "@/lib/category-tree"

/** Cây danh mục công khai (header, footer, bộ lọc, breadcrumb). Dùng chung bản cache với `useCategoryOptions`. */
export function useCategoryTree(): {
  tree: CategoryTree | null
  isPending: boolean
  isError: boolean
  refetch: () => void
} {
  const { data, isPending, isError, refetch } = useCategoryOptions()
  const tree = useMemo(() => (data ? buildCategoryTree(data) : null), [data])
  return { tree, isPending, isError, refetch: () => void refetch() }
}
