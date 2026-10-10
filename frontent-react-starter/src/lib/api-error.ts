import axios from "axios"

/** Một lỗi theo từng trường, đúng dạng backend trả trong `errors`. */
export interface FieldError {
  field: string
  message: string
}

/**
 * Lỗi thống nhất cho mọi lời gọi API. Component và form chỉ làm việc với lớp
 * này, không bao giờ đọc lỗi thô của axios.
 */
export class ApiError extends Error {
  /** 0 nghĩa là không nhận được phản hồi (mất mạng, quá thời gian chờ). */
  readonly statusCode: number
  readonly errors: FieldError[]

  constructor(statusCode: number, message: string, errors: FieldError[] = []) {
    super(message)
    this.name = "ApiError"
    this.statusCode = statusCode
    this.errors = errors
  }

  /** `{ email: "Email không đúng định dạng" }` — lấy lỗi đầu tiên của mỗi trường. */
  get fieldErrors(): Record<string, string> {
    const result: Record<string, string> = {}
    for (const { field, message } of this.errors) {
      if (!(field in result)) result[field] = message
    }
    return result
  }

  get isNetworkError(): boolean {
    return this.statusCode === 0
  }

  /** Đổi bất kỳ lỗi nào thành ApiError. Lỗi bị hủy (abort) được giữ nguyên. */
  static from(error: unknown): ApiError {
    if (error instanceof ApiError) return error
    if (!axios.isAxiosError(error)) {
      return new ApiError(0, "Có lỗi xảy ra, vui lòng thử lại.")
    }

    const response = error.response
    if (!response) {
      return new ApiError(
        0,
        error.code === "ECONNABORTED"
          ? "Máy chủ phản hồi quá lâu. Vui lòng thử lại sau."
          : "Không kết nối được máy chủ. Kiểm tra mạng rồi thử lại.",
      )
    }

    const body = response.data as
      | { message?: unknown; errors?: unknown }
      | undefined
    const message =
      typeof body?.message === "string" && body.message
        ? body.message
        : "Có lỗi xảy ra, vui lòng thử lại."
    const errors = Array.isArray(body?.errors)
      ? (body.errors as FieldError[]).filter(
          (item) =>
            typeof item?.field === "string" && typeof item?.message === "string",
        )
      : []

    return new ApiError(response.status, message, errors)
  }
}
