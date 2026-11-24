import type { DefaultJobOptions } from 'bullmq';

// Tên hàng đợi email. Tên thật trong Redis còn có tiền tố QUEUE_PREFIX (mặc định "ecommerce"): ecommerce:email:*
export const EMAIL_QUEUE = 'email';

// Tên các loại job của hàng đợi email. Chặng nền chỉ có "ping" (job thử nghiệm, không gửi mail).
export const EMAIL_JOB = {
  PING: 'ping',
} as const;

// Thời gian chờ tối đa khi kiểm Redis lúc khởi động; quá hạn thì app dừng với thông báo cách sửa
export const REDIS_STARTUP_TIMEOUT_MS = 5000;

// Giãn cách tối thiểu giữa hai dòng log lỗi Redis liên tiếp (Redis mất thì ioredis báo lỗi mỗi lần thử nối lại)
export const REDIS_ERROR_LOG_INTERVAL_MS = 30_000;

// Redis chạy chế độ noeviction (đầy thì từ chối ghi, không tự xóa), nên job xong phải được dọn đều đặn
// nếu không Redis sẽ đầy dần. Giữ job xong 1 giờ / tối đa 1000 job, job lỗi 7 ngày / tối đa 5000 job để còn điều tra.
export const DEFAULT_JOB_OPTIONS: DefaultJobOptions = {
  attempts: 3,
  backoff: { type: 'exponential', delay: 5000 },
  removeOnComplete: { age: 3600, count: 1000 },
  removeOnFail: { age: 7 * 24 * 3600, count: 5000 },
};
