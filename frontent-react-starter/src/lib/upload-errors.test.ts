import { describe, expect, it } from "vitest"
import { ApiError } from "./api-error"
import { describeUploadError, isFileProblem } from "./upload-errors"

describe("describeUploadError", () => {
  it("429 UPLOAD_QUOTA_EXCEEDED: câu của frontend", () => {
    const error = new ApiError(429, "Bạn đã đạt giới hạn 100 ảnh mỗi 24 giờ", [], "UPLOAD_QUOTA_EXCEEDED")
    expect(describeUploadError(error)).toMatch(/24 giờ/)
    expect(describeUploadError(error)).not.toBe(error.message)
  })

  it("503 STORAGE_NOT_CONFIGURED và 502 STORAGE_UPLOAD_FAILED: câu của frontend", () => {
    expect(describeUploadError(new ApiError(503, "x", [], "STORAGE_NOT_CONFIGURED"))).toMatch(/chưa được cấu hình/)
    expect(describeUploadError(new ApiError(502, "x", [], "STORAGE_UPLOAD_FAILED"))).toMatch(/dịch vụ lưu trữ/)
  })

  it("413 và 415 (không có mã): giữ nguyên thông báo của server", () => {
    const big = new ApiError(413, "File vượt quá dung lượng cho phép (tối đa 5 MB)")
    const mp = new ApiError(413, "Ảnh quá lớn về kích thước (tối đa 25 triệu điểm ảnh)")
    const type = new ApiError(415, "Chỉ chấp nhận ảnh JPEG, PNG hoặc WebP")
    expect(describeUploadError(big)).toBe(big.message)
    expect(describeUploadError(mp)).toBe(mp.message)
    expect(describeUploadError(type)).toBe(type.message)
  })

  it("mã lạ: thông báo của server", () => {
    const error = new ApiError(500, "Lỗi hệ thống", [], "SOMETHING_NEW")
    expect(describeUploadError(error)).toBe("Lỗi hệ thống")
  })
})

describe("isFileProblem", () => {
  it("413 và 415 là lỗi do file; còn lại thử lại được", () => {
    expect(isFileProblem(new ApiError(413, "x"))).toBe(true)
    expect(isFileProblem(new ApiError(415, "x"))).toBe(true)
    expect(isFileProblem(new ApiError(429, "x", [], "UPLOAD_QUOTA_EXCEEDED"))).toBe(false)
    expect(isFileProblem(new ApiError(0, "mất mạng"))).toBe(false)
  })
})
