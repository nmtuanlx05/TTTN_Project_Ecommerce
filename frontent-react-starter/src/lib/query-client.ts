import { QueryClient } from "@tanstack/react-query"
import { ApiError } from "@/lib/api-error"

/** Không thử lại lỗi 4xx (dữ liệu sai thì thử lại cũng sai); lỗi khác thử tối đa 1 lần. */
function shouldRetry(failureCount: number, error: unknown): boolean {
  if (error instanceof ApiError && error.statusCode >= 400 && error.statusCode < 500) {
    return false
  }
  return failureCount < 1
}

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30_000,
      refetchOnWindowFocus: false,
      retry: shouldRetry,
    },
    mutations: { retry: false },
  },
})
