import axios, { type AxiosRequestConfig } from "axios"
import { ApiError } from "@/lib/api-error"
import type { Paginated, PaginationMeta } from "@/types/api"

const baseURL = import.meta.env.VITE_API_URL
if (!baseURL) {
  throw new Error(
    "Thiếu VITE_API_URL. Sao chép .env.example thành .env, điền địa chỉ backend rồi khởi động lại.",
  )
}

/**
 * Instance axios duy nhất của ứng dụng. Chỉ file này và `features/<module>/api.ts`
 * được import axios; component gọi qua hook trong `queries.ts`.
 */
const apiClient = axios.create({
  baseURL,
  timeout: 15_000,
  headers: { "Content-Type": "application/json" },
})

// Interceptor duy nhất chừa cho Auth: khi làm đăng nhập, gắn
// `config.headers.Authorization = "Bearer <token>"` ở đây.
apiClient.interceptors.request.use((config) => config)

apiClient.interceptors.response.use(
  (response) => response,
  (error: unknown) =>
    axios.isCancel(error) ? Promise.reject(error) : Promise.reject(ApiError.from(error)),
)

interface Envelope<T> {
  success: boolean
  data: T
  meta?: PaginationMeta
}

/** Bóc `{ success, data }`. Backend luôn dùng status HTTP, đây chỉ là lớp phòng thủ. */
function unwrap<T>(body: Envelope<T>): Envelope<T> {
  if (!body || body.success !== true) {
    throw new ApiError(0, "Phản hồi từ máy chủ không đúng định dạng.")
  }
  return body
}

/** GET trả một đối tượng: trả thẳng `data`. */
async function apiGet<T>(url: string, config?: AxiosRequestConfig): Promise<T> {
  const response = await apiClient.get<Envelope<T>>(url, config)
  return unwrap(response.data).data
}

/** GET danh sách phân trang: trả `{ items, meta }`. */
async function apiGetPage<T>(
  url: string,
  config?: AxiosRequestConfig,
): Promise<Paginated<T>> {
  const response = await apiClient.get<Envelope<T[]>>(url, config)
  const body = unwrap(response.data)
  if (!body.meta) {
    throw new ApiError(0, "Phản hồi từ máy chủ thiếu thông tin phân trang.")
  }
  return { items: body.data, meta: body.meta }
}

/** POST / PATCH / PUT: trả thẳng `data`. */
async function apiSend<T>(
  method: "post" | "patch" | "put",
  url: string,
  body?: unknown,
): Promise<T> {
  const response = await apiClient.request<Envelope<T>>({ method, url, data: body })
  return unwrap(response.data).data
}

export { apiClient, apiGet, apiGetPage, apiSend }
