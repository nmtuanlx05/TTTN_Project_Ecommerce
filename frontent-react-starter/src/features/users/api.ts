import { apiGet, apiGetPage, apiSend } from "@/lib/api-client"
import type { Paginated } from "@/types/api"
import type {
  CreateUserInput,
  UpdateUserInput,
  UpdateUserStatusInput,
  User,
  UserListParams,
} from "./types"

/** Gọi API users (docs/api/users.md). Chỉ `queries.ts` được import file này. */

export function listUsers(
  params: UserListParams,
  signal?: AbortSignal,
): Promise<Paginated<User>> {
  return apiGetPage<User>("/users", { params, signal })
}

export function getUser(id: number, signal?: AbortSignal): Promise<User> {
  return apiGet<User>(`/users/${id}`, { signal })
}

export function createUser(input: CreateUserInput): Promise<User> {
  return apiSend<User>("post", "/users", input)
}

export function updateUser(id: number, input: UpdateUserInput): Promise<User> {
  return apiSend<User>("patch", `/users/${id}`, input)
}

export function setUserStatus(id: number, input: UpdateUserStatusInput): Promise<User> {
  return apiSend<User>("patch", `/users/${id}/status`, input)
}
