import { describe, expect, it } from "vitest"
import { buildCreateInput, buildUpdateInput, toFormValues } from "./form-mapping"
import type { ProductFormValues } from "./schemas"
import type { ProductDetail } from "./types"

const CLOUD = "https://res.cloudinary.com/demo/image/upload/v1762740000/mono-studio/production/products/a.jpg"
const DISK = "http://localhost:3000/uploads/products/b.webp"
const PICSUM = "https://picsum.photos/seed/x/600/800"

function product(urls: string[]): ProductDetail {
  return {
    id: 1,
    name: "Áo",
    slug: "ao",
    description: null,
    price: 100000,
    imageUrl: urls[0] ?? null,
    images: urls.map((url, index) => ({ id: index + 1, url, sortOrder: index })),
    isActive: true,
    createdAt: "2026-11-01T00:00:00.000Z",
    updatedAt: "2026-11-01T00:00:00.000Z",
    category: { id: 3, name: "Áo", slug: "ao" },
    variants: [
      { id: 10, sku: "A-S", size: "S", color: "Trắng", colorHex: null, isActive: true, stock: 0, reserved: 0, minStock: 0 },
    ],
  }
}

describe("ảnh khi sửa sản phẩm", () => {
  const baseline = product([CLOUD, DISK, PICSUM])

  it("không đổi ảnh (Cloudinary + /uploads + picsum): KHÔNG gửi images", () => {
    const { input } = buildUpdateInput(baseline, toFormValues(baseline))
    expect(input).not.toHaveProperty("images")
  })

  it("đổi thứ tự: gửi lại cả mảng, ảnh đã có gửi {url}, không có assetId", () => {
    const values = toFormValues(baseline)
    values.images = [values.images[2], values.images[0], values.images[1]]
    const { input } = buildUpdateInput(baseline, values)
    expect(input.images).toEqual([{ url: PICSUM }, { url: CLOUD }, { url: DISK }])
  })

  it("thêm ảnh vừa tải: ảnh mới gửi {assetId}, ảnh cũ giữ {url}", () => {
    const values = toFormValues(baseline)
    values.images = [...values.images, { url: "https://res.cloudinary.com/demo/image/upload/v2/new.jpg", assetId: 41 }]
    const { input } = buildUpdateInput(baseline, values)
    expect(input.images).toEqual([{ url: CLOUD }, { url: DISK }, { url: PICSUM }, { assetId: 41 }])
  })

  it("xóa hết ảnh: gửi mảng rỗng", () => {
    const values: ProductFormValues = { ...toFormValues(baseline), images: [] }
    expect(buildUpdateInput(baseline, values).input.images).toEqual([])
  })

  it("form lấy từ API không mang assetId", () => {
    for (const image of toFormValues(baseline).images) expect(image.assetId).toBeUndefined()
  })
})

describe("ảnh khi tạo sản phẩm", () => {
  it("ảnh vừa tải gửi {assetId}, ảnh dán URL gửi {url}", () => {
    const values: ProductFormValues = {
      ...toFormValues(product([])),
      name: "Áo",
      price: "100.000",
      categoryId: 3,
      images: [{ url: CLOUD, assetId: 7 }, { url: ` ${PICSUM} ` }],
    }
    expect(buildCreateInput(values).images).toEqual([{ assetId: 7 }, { url: PICSUM }])
  })
})
