// jobId cố định cho các job nghiệp vụ, hàm thuần (không import bullmq).
// Quy tắc custom jobId của BullMQ (đã kiểm ở node_modules/bullmq, test job-ids.spec.ts gọi chính validateOptions của nó):
// không được là số nguyên, không được chứa ":", không được là "0". Vì vậy nối bằng "-" và chỉ nhận mã đơn gồm chữ, số, "-".
// jobId trùng khi job cũ còn trong Redis (đang chờ/chạy, xong trong 1 giờ, lỗi trong 7 ngày) thì BullMQ bỏ qua lần sau.

const ORDER_CODE_FOR_JOB_ID = /^[A-Za-z0-9-]+$/;

function assertOrderCode(code: string) {
  if (!ORDER_CODE_FOR_JOB_ID.test(code)) {
    throw new Error('Mã đơn không hợp lệ để làm jobId');
  }
}

// "order-confirmation-<mã đơn>", ví dụ order-confirmation-MS-261126-AB12
export function orderConfirmationJobId(code: string): string {
  assertOrderCode(code);
  return `order-confirmation-${code}`;
}
