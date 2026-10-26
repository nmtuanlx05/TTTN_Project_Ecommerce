import { configureAuth } from "@/lib/api-client"
import { queryClient } from "@/lib/query-client"
import { useAuthStore } from "./auth-store"

/**
 * Nối `lib/api-client` (không được import features) với store. Gọi một lần trong main.tsx.
 * Điều hướng về /login do `RequireAuth` làm khi thấy status chuyển sang anonymous.
 */
export function setupAuthBridge(): void {
  configureAuth({
    getAccessToken: () => useAuthStore.getState().accessToken,
    setAccessToken: (token) => useAuthStore.getState().setAccessToken(token),
    onSessionExpired: () => {
      useAuthStore.getState().expireSession()
      queryClient.clear()
    },
  })
}
