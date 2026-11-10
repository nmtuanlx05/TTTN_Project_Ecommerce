import { describe, expect, it } from "vitest"
import { ApiError } from "@/lib/api-error"
import { collapseImageErrors, remapVariantErrors } from "./server-error-mapping"

describe("collapseImageErrors", () => {
  it("gộp images.N.url và images.N.assetId về ô images", () => {
    const error = new ApiError(400, "Dữ liệu không hợp lệ", [
      { field: "images.0.url", message: "a" },
      { field: "images.2.assetId", message: "b" },
      { field: "name", message: "c" },
    ])
    expect(collapseImageErrors(error).errors.map((item) => item.field)).toEqual(["images", "images", "name"])
  })

  it("EXTERNAL_IMAGE_NOT_ALLOWED: báo rõ ở ô images kể cả khi server không kèm errors", () => {
    const error = new ApiError(400, "x", [], "EXTERNAL_IMAGE_NOT_ALLOWED")
    const [item] = collapseImageErrors(error).errors
    expect(item.field).toBe("images")
    expect(item.message).toMatch(/đường dẫn bên ngoài/)
  })

  it("MEDIA_ASSET_INVALID thay các lỗi images.N bằng một câu của frontend", () => {
    const error = new ApiError(400, "x", [{ field: "images.1", message: "server" }], "MEDIA_ASSET_INVALID")
    const errors = collapseImageErrors(error).errors
    expect(errors).toHaveLength(1)
    expect(errors[0].message).toMatch(/không còn hiệu lực/)
  })

  it("mã lỗi không bị mất khi remapVariantErrors chạy trước", () => {
    const error = new ApiError(400, "x", [], "EXTERNAL_IMAGE_NOT_ALLOWED")
    expect(remapVariantErrors(error, []).code).toBe("EXTERNAL_IMAGE_NOT_ALLOWED")
  })
})
