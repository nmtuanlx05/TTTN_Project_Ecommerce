import {
  keepPreviousData,
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query"
import type { ApiError } from "@/lib/api-error"
import type {
  CreateUserInput,
  UpdateUserInput,
  User,
  UserListParams,
} from "./types"
import {
  createUser,
  getUser,
  listUsers,
  setUserStatus,
  updateUser,
} from "./api"

export const userKeys = {
  /** Tiền tố chung: làm mới mọi danh sách và chi tiết user. */
  all: ["users"] as const,
  list: (params: UserListParams) => ["users", params] as const,
  detail: (id: number) => ["users", "detail", id] as const,
}

/** Danh sách user. Giữ dữ liệu trang cũ trong lúc tải trang mới để bảng không giật. */
export function useUsers(params: UserListParams) {
  return useQuery({
    queryKey: userKeys.list(params),
    queryFn: ({ signal }) => listUsers(params, signal),
    placeholderData: keepPreviousData,
  })
}

export function useUser(id: number | undefined) {
  return useQuery({
    queryKey: userKeys.detail(id ?? 0),
    queryFn: ({ signal }) => getUser(id as number, signal),
    enabled: id !== undefined,
  })
}

export function useCreateUser() {
  const queryClient = useQueryClient()
  return useMutation<User, ApiError, CreateUserInput>({
    mutationFn: createUser,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: userKeys.all }),
  })
}

export function useUpdateUser() {
  const queryClient = useQueryClient()
  return useMutation<User, ApiError, { id: number; input: UpdateUserInput }>({
    mutationFn: ({ id, input }) => updateUser(id, input),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: userKeys.all }),
  })
}

/** Khóa / mở khóa (xóa mềm bằng `isActive`). */
export function useToggleUserStatus() {
  const queryClient = useQueryClient()
  return useMutation<User, ApiError, { id: number; isActive: boolean }>({
    mutationFn: ({ id, isActive }) => setUserStatus(id, { isActive }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: userKeys.all }),
  })
}
