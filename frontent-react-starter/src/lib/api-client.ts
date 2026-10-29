import axios, {
  type AxiosRequestConfig,
  type InternalAxiosRequestConfig,
} from "axios"
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
 *
 * `withCredentials` bắt buộc: cookie `refresh_token` (path `/auth`) chỉ được gửi/nhận
 * khi frontend (:5173) gọi backend (:3000) nếu bật cờ này (docs/api/auth.md).
 */
const apiClient = axios.create({
  baseURL,
  timeout: 15_000,
  withCredentials: true,
  headers: { "Content-Type": "application/json" },
})

/**
 * Cầu nối tới phiên đăng nhập. Store nằm ở `features/auth` mà `lib/` không được
 * import features, nên `features/auth` đăng ký các callback này từ ngoài
 * (xem `features/auth/setup-auth-bridge.ts`).
 */
interface AuthBridge {
  getAccessToken: () => string | null
  setAccessToken: (token: string) => void
  /** Gọi khi không làm mới được phiên: xóa phiên, xóa cache, chuyển về /login. */
  onSessionExpired: () => void
}

let authBridge: AuthBridge | null = null

function configureAuth(bridge: AuthBridge): void {
  authBridge = bridge
}

type RetriableConfig = InternalAxiosRequestConfig & { _retried?: boolean }

/** Hai endpoint này tự trả 401 theo nghĩa riêng, không được kích hoạt làm mới token. */
function isAuthEndpoint(url: string | undefined): boolean {
  return !!url && (url.includes("/auth/login") || url.includes("/auth/refresh"))
}

apiClient.interceptors.request.use((config) => {
  const token = authBridge?.getAccessToken()
  if (token) config.headers.set("Authorization", `Bearer ${token}`)
  return config
})

let refreshPromise: Promise<string> | null = null

/**
 * Đổi cookie refresh lấy access token mới. Mọi nơi gọi cùng lúc (nhiều request
 * 401, AuthBootstrap) dùng chung MỘT promise; xong (thành công hay thất bại) thì
 * xóa promise để lần gọi sau (vd "Thử lại") chạy lại được.
 */
function refreshSession(): Promise<string> {
  if (!refreshPromise) {
    refreshPromise = apiClient
      .post<Envelope<{ accessToken: string }>>("/auth/refresh")
      .then((response) => {
        const { accessToken } = unwrap(response.data).data
        authBridge?.setAccessToken(accessToken)
        return accessToken
      })
      .finally(() => {
        refreshPromise = null
      })
  }
  return refreshPromise
}

apiClient.interceptors.response.use(
  (response) => response,
  async (error: unknown) => {
    if (axios.isCancel(error)) return Promise.reject(error)
    const apiError = ApiError.from(error)

    const config = axios.isAxiosError(error)
      ? (error.config as RetriableConfig | undefined)
      : undefined
    const bridge = authBridge
    const sentAuth = config?.headers?.get("Authorization")
    // Chỉ làm mới khi request đã gửi token (người chưa đăng nhập gặp 401 thì không có gì để làm mới).
    const canRefresh =
      bridge !== null &&
      !!config &&
      !config._retried &&
      !!sentAuth &&
      apiError.statusCode === 401 &&
      !isAuthEndpoint(config.url)
    if (!canRefresh) return Promise.reject(apiError)

    config._retried = true
    let token: string
    try {
      // Request khác đã làm mới xong trong lúc request này đang bay: dùng token mới luôn.
      const current = bridge.getAccessToken()
      token = current && `Bearer ${current}` !== sentAuth ? current : await refreshSession()
    } catch (refreshError) {
      const failure = ApiError.from(refreshError)
      // Chỉ kết thúc phiên khi máy chủ từ chối refresh (4xx). Mất mạng hoặc 5xx
      // thì giữ phiên và báo lỗi cho request gốc để người dùng thử lại.
      if (failure.statusCode >= 400 && failure.statusCode < 500) bridge.onSessionExpired()
      return Promise.reject(failure)
    }
    config.headers.set("Authorization", `Bearer ${token}`)
    // `_retried` đã bật nên nếu lần này vẫn lỗi thì chỉ đổi thành ApiError, không vòng lặp.
    return apiClient(config)
  },
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

/** POST / PATCH / PUT / DELETE: trả thẳng `data`. */
async function apiSend<T>(
  method: "post" | "patch" | "put" | "delete",
  url: string,
  body?: unknown,
): Promise<T> {
  const response = await apiClient.request<Envelope<T>>({ method, url, data: body })
  return unwrap(response.data).data
}

/** Tùy chọn của `apiUpload`. */
interface UploadOptions {
  /** Hủy request đang gửi (người dùng bấm Hủy, hoặc component bị gỡ). */
  signal?: AbortSignal
  /** Phần trăm đã gửi (0–100). Chỉ được gọi khi trình duyệt tính được tổng dung lượng. */
  onProgress?: (percent: number) => void
}

/** Backend chỉ nhận đúng một trường multipart tên `file` và không nhận trường text nào (docs/api/uploads.md). */
const UPLOAD_FIELD = "file"

/** Dài hơn timeout mặc định (15s): ảnh vài MB trên mạng chậm cần nhiều thời gian hơn. */
const UPLOAD_TIMEOUT_MS = 60_000

/**
 * POST một file dạng multipart, trả thẳng `data`.
 *
 * Instance ép sẵn `Content-Type: application/json`; nếu giữ nguyên, axios sẽ đổi `FormData` thành chuỗi JSON
 * và backend báo thiếu file. `Content-Type: false` gỡ header đó để trình duyệt tự thêm
 * `multipart/form-data; boundary=...`. Gặp 401, interceptor gửi lại đúng request này (`FormData` còn nguyên file).
 */
async function apiUpload<T>(
  url: string,
  file: File,
  { signal, onProgress }: UploadOptions = {},
): Promise<T> {
  const body = new FormData()
  body.append(UPLOAD_FIELD, file)
  const response = await apiClient.post<Envelope<T>>(url, body, {
    headers: { "Content-Type": false },
    timeout: UPLOAD_TIMEOUT_MS,
    signal,
    onUploadProgress: (event) => {
      if (event.progress !== undefined) onProgress?.(Math.round(event.progress * 100))
    },
  })
  return unwrap(response.data).data
}

export {
  apiClient,
  apiGet,
  apiGetPage,
  apiSend,
  apiUpload,
  configureAuth,
  refreshSession,
}
export type { UploadOptions }
