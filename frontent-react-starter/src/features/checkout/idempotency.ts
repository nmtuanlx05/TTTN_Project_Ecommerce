import { v4 } from "uuid"

/** Khóa chống đặt trùng: UUID v4 (36 ký tự `0-9a-f-`) nằm trong định dạng backend nhận (8-64 ký tự `A-Za-z0-9._:-`). */
export function newIdempotencyKey(): string {
  return v4()
}
