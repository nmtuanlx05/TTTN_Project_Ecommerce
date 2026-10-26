import { useEffect, useState, type ReactNode } from "react"
import { ApiError } from "@/lib/api-error"
import { getMe, refresh } from "./api"
import { useAuthStore } from "./auth-store"
import { SessionErrorScreen } from "./components/session-error-screen"
import { SessionLoadingScreen } from "./components/session-loading-screen"

let bootstrapPromise: Promise<void> | null = null

/**
 * Khôi phục phiên sau F5: refresh bằng cookie rồi tải user. Promise nằm ở cấp module
 * nên React StrictMode (chạy effect hai lần) vẫn chỉ gửi một lần. Thất bại thì xóa
 * promise để "Thử lại" chạy được.
 */
function restoreSession(): Promise<void> {
  if (useAuthStore.getState().status !== "loading") return Promise.resolve()
  if (!bootstrapPromise) {
    bootstrapPromise = (async () => {
      try {
        const accessToken = await refresh()
        const user = await getMe()
        useAuthStore.getState().startSession(accessToken, user)
      } catch (error) {
        const failure = ApiError.from(error)
        if (failure.statusCode === 401) {
          // Chưa đăng nhập (hoặc phiên đã hết): không phải lỗi, không báo gì.
          useAuthStore.getState().clearSession()
          return
        }
        throw failure
      }
    })().finally(() => {
      bootstrapPromise = null
    })
  }
  return bootstrapPromise
}

/** Chặn render cả ứng dụng tới khi biết người dùng đã đăng nhập hay chưa, để không nháy sang /login. */
function AuthBootstrap({ children }: { children: ReactNode }) {
  const status = useAuthStore((state) => state.status)
  const [error, setError] = useState<ApiError | null>(null)

  useEffect(() => {
    restoreSession().catch((failure: unknown) => setError(ApiError.from(failure)))
  }, [])

  if (status !== "loading") return children
  if (error) {
    return (
      <SessionErrorScreen
        message={error.message}
        onRetry={() => {
          setError(null)
          restoreSession().catch((failure: unknown) => setError(ApiError.from(failure)))
        }}
      />
    )
  }
  return <SessionLoadingScreen />
}

export { AuthBootstrap }
