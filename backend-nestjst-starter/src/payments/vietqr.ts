import {
  ORDER_CODE_ALPHABET,
  ORDER_CODE_PREFIX,
} from '../orders/orders.constants';

// ===== Dựng chuỗi VietQR / NAPAS 247 động (EMVCo TLV) =====
// Phần này là hàm thuần. Việc app ngân hàng thật quét được và điền đúng số tiền/nội dung CHƯA kiểm chứng tự động.

// CRC-16/CCITT-FALSE: poly 0x1021, init 0xFFFF, không đảo bit, xor-out 0
export function crc16(input: string): number {
  let crc = 0xffff;
  for (let i = 0; i < input.length; i++) {
    crc ^= input.charCodeAt(i) << 8;
    for (let bit = 0; bit < 8; bit++) {
      crc = crc & 0x8000 ? ((crc << 1) ^ 0x1021) & 0xffff : (crc << 1) & 0xffff;
    }
  }
  return crc;
}

const tlv = (id: string, value: string) => {
  if (value.length > 99) {
    throw new Error(`Giá trị tag ${id} dài quá 99 ký tự`);
  }
  return `${id}${String(value.length).padStart(2, '0')}${value}`;
};

export interface VietQrInput {
  bankBin: string;
  accountNo: string;
  amount: number;
  content: string;
}

export function buildVietQrPayload(input: VietQrInput): string {
  const { bankBin, accountNo, amount, content } = input;
  if (!Number.isInteger(amount) || amount <= 0) {
    throw new Error('Số tiền QR phải là số nguyên dương');
  }
  const consumer = tlv('00', bankBin) + tlv('01', accountNo);
  const body =
    tlv('00', '01') + // phiên bản
    tlv('01', '12') + // 12 = QR động (có số tiền)
    tlv(
      '38',
      tlv('00', 'A000000727') + tlv('01', consumer) + tlv('02', 'QRIBFTTA'),
    ) + // chuyển nhanh NAPAS 247 tới tài khoản
    tlv('53', '704') + // VND
    tlv('54', String(amount)) +
    tlv('58', 'VN') +
    tlv('62', tlv('08', content)) +
    '6304';
  return body + crc16(body).toString(16).toUpperCase().padStart(4, '0');
}

// ===== Nội dung chuyển khoản =====

// MS-261105-PKGA -> MS261105PKGA (bỏ ký tự đặc biệt, viết hoa): ngắn, mọi app ngân hàng hiển thị đủ
export const buildTransferContent = (orderCode: string) =>
  normalizeContent(orderCode);

// Viết hoa, bỏ mọi ký tự không phải chữ/số (kể cả dấu cách, gạch ngang)
export const normalizeContent = (raw: string) =>
  raw
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, '');

const ORDER_CODE_IN_CONTENT = new RegExp(
  `${ORDER_CODE_PREFIX}(\\d{6})([${ORDER_CODE_ALPHABET}]{4})`,
  'g',
);

// Tìm mã đơn trong nội dung chuyển khoản gốc (ngân hàng có thể thêm chữ phía trước/sau).
// Đúng một mã khác nhau -> trả mã dạng MS-YYMMDD-XXXX; không có hoặc nhiều hơn một -> null (coi là không khớp).
export function extractOrderCode(content: string): string | null {
  const normalized = normalizeContent(content);
  const found = new Set<string>();
  for (const match of normalized.matchAll(ORDER_CODE_IN_CONTENT)) {
    found.add(`${ORDER_CODE_PREFIX}-${match[1]}-${match[2]}`);
  }
  return found.size === 1 ? [...found][0] : null;
}
