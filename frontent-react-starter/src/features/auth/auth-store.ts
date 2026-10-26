import { create } from "zustand";
import type { User } from "@/types/user";
import type { AuthStatus } from "./types";

interface AuthState {
  /** Chỉ giữ trong bộ nhớ: không persist, không ghi localStorage/sessionStorage. */
  accessToken: string | null;
  user: User | null;
  status: AuthStatus;
  /** Phiên vừa bị kết thúc do hết hạn/bị khóa; trang đăng nhập đọc để hiện thông báo một lần. */
  sessionExpired: boolean;
  setAccessToken: (token: string) => void;
  startSession: (accessToken: string, user: User) => void;
  /** Không có phiên (chưa đăng nhập, hoặc vừa đăng xuất). */
  clearSession: () => void;
  /** Phiên bị máy chủ từ chối: như `clearSession` nhưng báo cho trang đăng nhập. */
  expireSession: () => void;
  dismissSessionExpired: () => void;
}

export const useAuthStore = create<AuthState>()((set, get) => ({
  accessToken: null,
  user: null,
  status: "loading",
  sessionExpired: false,
  setAccessToken: (accessToken) => set({ accessToken }),
  // Đăng nhập thành công: bỏ cờ hết hạn để thông báo cũ không hiện lại.
  startSession: (accessToken, user) =>
    set({ accessToken, user, status: "authenticated", sessionExpired: false }),
  clearSession: () =>
    set({ accessToken: null, user: null, status: "anonymous" }),
  expireSession: () => {
    // Chỉ báo "hết hạn" nếu trước đó thực sự đang đăng nhập.
    const wasAuthenticated = get().status === "authenticated";
    set({
      accessToken: null,
      user: null,
      status: "anonymous",
      sessionExpired: wasAuthenticated || get().sessionExpired,
    });
  },
  dismissSessionExpired: () => set({ sessionExpired: false }),
}));
