import { randomInt } from 'crypto';
import {
  ORDER_CODE_ALPHABET,
  ORDER_CODE_PREFIX,
  ORDER_CODE_SUFFIX_LENGTH,
  VN_UTC_OFFSET_HOURS,
} from './orders.constants';

const pad2 = (n: number) => String(n).padStart(2, '0');

// YYMMDD theo GMT+7, tính từ thời điểm UTC nên không phụ thuộc múi giờ máy chủ
export function vnDateStamp(now: Date) {
  const vn = new Date(now.getTime() + VN_UTC_OFFSET_HOURS * 3_600_000);
  return `${pad2(vn.getUTCFullYear() % 100)}${pad2(vn.getUTCMonth() + 1)}${pad2(vn.getUTCDate())}`;
}

// MS-YYMMDD-XXXX; phần ngẫu nhiên không lộ số đơn trong ngày. `random` cho phép test cố định.
export function generateOrderCode(
  now: Date,
  random: (max: number) => number = randomInt,
) {
  let suffix = '';
  for (let i = 0; i < ORDER_CODE_SUFFIX_LENGTH; i++) {
    suffix += ORDER_CODE_ALPHABET[random(ORDER_CODE_ALPHABET.length)];
  }
  return `${ORDER_CODE_PREFIX}-${vnDateStamp(now)}-${suffix}`;
}
