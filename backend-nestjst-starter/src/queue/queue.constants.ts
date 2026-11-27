import type { DefaultJobOptions } from 'bullmq';

// Tên hàng đợi email. Tên thật trong Redis còn có tiền tố QUEUE_PREFIX (mặc định "ecommerce"): ecommerce:email:*
export const EMAIL_QUEUE = 'email';

// Tên các loại job của hàng đợi email. "ping" là job thử nghiệm (không gửi mail); "welcome" gửi mail chào mừng sau đăng ký;
// "order-confirmation" gửi thư "Đã nhận đơn hàng" sau khi đặt đơn thành công.
export const EMAIL_JOB = {
  PING: 'ping',
  WELCOME: 'welcome',
  ORDER_CONFIRMATION: 'order-confirmation',
} as const;

// Dữ liệu của job "welcome": CHỈ userId. Email/tên đọc lại từ DB lúc xử lý (không để dữ liệu cá nhân nằm trong Redis).
export interface WelcomeJobData {
  userId: number;
}

// Dữ liệu của job thư đơn hàng: CHỈ orderId. Email, tên, địa chỉ, dòng hàng đọc lại từ DB lúc xử lý.
export interface OrderMailJobData {
  orderId: number;
}

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
