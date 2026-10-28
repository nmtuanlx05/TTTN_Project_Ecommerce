/** Danh mục công khai (GET /categories): phẳng, frontend tự dựng cây theo `parentId`. */
export interface PublicCategory {
  id: number
  name: string
  slug: string
  parentId: number | null
}
