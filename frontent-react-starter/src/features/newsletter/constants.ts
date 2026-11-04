/** Độ dài email tối đa (cột `email` của backend là VARCHAR(191)). */
export const EMAIL_MAX_LENGTH = 191

/** TẠM: câu hiện khi bấm đăng ký, vì backend chưa có endpoint nhận tin. Xóa cùng nhánh TẠM trong `api.ts` khi có backend. */
export const NEWSLETTER_UNAVAILABLE_MESSAGE =
  "Tính năng đăng ký nhận tin đang được hoàn thiện. Bạn vui lòng quay lại sau."
