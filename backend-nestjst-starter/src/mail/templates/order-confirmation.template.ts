import { escapeHtml } from '../escape-html';
import { formatVnd, formatVnDateTime } from './mail-format';
import {
  brandHeader,
  CARD_CLOSE,
  CARD_OPEN,
  COD_METHOD_LABEL,
  FONT_BODY,
  FONT_HEAD,
  FONT_SERIF,
  footer,
  footerTextLines,
  itemRowWithImage,
  itemTextLines,
  mailHead,
  normalizeThreshold,
  ONLINE_METHOD_LABEL,
  type OrderMailCommon,
  type OrderMailLinks,
  buildOrderLinks,
  orderGreetingName,
  paragraph,
  preheaderBlock,
  primaryButton,
  progressBar,
  shortAddress,
  spacer,
  subjectSafe,
  summaryRows,
  summaryTextLines,
  topBar,
} from './order-mail-parts';

// Thư "Đơn hàng đã được ghi nhận": hàm TypeScript thuần. Bản thiết kế gốc: docs/mail-templates/order-confirmation.design.html.
// So với thiết kế: bỏ "Đổi trả trong 30 ngày", menu danh mục, "Xem trên trình duyệt", "Hỗ trợ", địa chỉ công ty, năm bản quyền,
// "Dự kiến giao", câu hứa "email tiếp theo", câu mời trả lời email. "Giao hàng tới" chỉ tên + địa chỉ rút gọn (không SĐT,
// số nhà, ghi chú). Mọi số tiền là giá trị đã lưu trong đơn. Mọi giá trị chèn vào HTML đều qua escapeHtml.

// Trạng thái thanh toán đọc LÚC GỬI (worker): COD; ONLINE còn chờ (có hạn); ONLINE đã trả
export type OrderConfirmationPayment =
  | { kind: 'COD' }
  | { kind: 'ONLINE_PENDING'; expiresAt: Date }
  | { kind: 'ONLINE_PAID' };

export interface OrderConfirmationInput extends OrderMailCommon {
  createdAt: Date;
  // Các cấp hành chính chụp trong đơn; trường null/rỗng bị bỏ
  wardName: string | null;
  districtName: string | null;
  provinceName: string | null;
  payment: OrderConfirmationPayment;
}

export interface RenderedOrderMail {
  subject: string;
  html: string;
  text: string;
}

const REASON_TEXT =
  'Email này được gửi tự động vì bạn vừa đặt hàng tại MONO STUDIO.';
const PENDING_TITLE = 'Đơn hàng đang chờ thanh toán.';
const PAID_TITLE = 'Đã thanh toán.';
const PAID_DETAIL = 'Cảm ơn bạn đã hoàn tất thanh toán cho đơn hàng.';

export const orderConfirmationSubject = (code: string) =>
  `MONO STUDIO · Đơn hàng #${subjectSafe(code)} đã được ghi nhận`;

const pendingSentence = (expiresAt: Date) =>
  `Vui lòng chuyển khoản trước ${formatVnDateTime(expiresAt)}. Quá hạn, đơn sẽ tự hủy.`;

const greetingSentence = (name: string | null) =>
  `Chào ${name ?? 'bạn'}, chúng mình đã nhận được đơn hàng của bạn. Bạn có thể xem trạng thái đơn bất cứ lúc nào trong mục Đơn hàng của tôi.`;

// Ô thông tin: mã đơn và ngày đặt (bỏ ô "Dự kiến giao" của thiết kế)
function infoBox(code: string, createdAt: Date): string {
  const cell = (label: string, value: string) =>
    `<td class="em-stack em-gap-b" width="50%" valign="top" style="padding:0 8px 0 0"><p style="margin:0;font-family:${FONT_BODY};font-weight:600;font-size:10.5px;line-height:1.4;letter-spacing:0.16em;text-transform:uppercase;color:#6B6760">${label}</p><p style="margin:6px 0 0;font-family:${FONT_BODY};font-weight:600;font-size:14px;line-height:1.5;color:#1A1A1A">${escapeHtml(value)}</p></td>`;
  return `<tr><td class="em-px"  style="padding:0 40px"><table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" bgcolor="#F3EFE8" style="background:#F3EFE8;border-radius:20px;border-collapse:separate"><tr><td style="padding:24px 26px 20px"><table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0"><tr>${cell('Mã đơn hàng', `#${code}`)}${cell('Ngày đặt', formatVnDateTime(createdAt))}</tr></table></td></tr></table></td></tr>`;
}

// Khung trạng thái thanh toán ngay dưới ô thông tin: vàng (chờ, có hạn và link), xanh (đã trả), COD không có
function paymentNotice(
  payment: OrderConfirmationPayment,
  links: OrderMailLinks,
): string {
  if (payment.kind === 'COD') return '';
  const box = (bg: string, color: string, inner: string) =>
    `${spacer(16)}<tr><td class="em-px"  style="padding:0 40px"><table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" bgcolor="${bg}" style="background:${bg};border-radius:18px;border-collapse:separate"><tr><td style="padding:18px 22px;font-family:${FONT_BODY};font-size:13.5px;line-height:1.7;color:${color}">${inner}</td></tr></table></td></tr>`;
  if (payment.kind === 'ONLINE_PENDING') {
    return box(
      '#FBF1D9',
      '#7A5A0C',
      `<strong>${PENDING_TITLE}</strong> ${escapeHtml(pendingSentence(payment.expiresAt))} <a href="${escapeHtml(links.onlinePayment)}" style="color:#7A5A0C;font-weight:600;text-decoration:underline">Thanh toán ngay</a>`,
    );
  }
  return box(
    '#E7EFE5',
    '#3F5B3C',
    `<strong>${PAID_TITLE}</strong> ${escapeHtml(PAID_DETAIL)}`,
  );
}

function infoCard(title: string, bodyHtml: string, padding: string): string {
  return `<td class="em-stack em-gap-b" width="50%" valign="top" style="${padding}"><table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" bgcolor="#F3EFE8" style="background:#F3EFE8;border-radius:20px;border-collapse:separate"><tr><td style="padding:22px 22px 24px"><p style="margin:0;font-family:${FONT_BODY};font-weight:600;font-size:10.5px;line-height:1.4;letter-spacing:0.16em;text-transform:uppercase;color:#8C6A45">${title}</p><div style="margin-top:10px;font-family:${FONT_BODY};font-size:13.5px;line-height:1.75;color:#4A4742">${bodyHtml}</div></td></tr></table></td>`;
}

export function renderOrderConfirmation(
  input: OrderConfirmationInput,
): RenderedOrderMail {
  const links = buildOrderLinks(input.frontendUrl, input.code);
  const subject = orderConfirmationSubject(input.code);
  const greetingName = orderGreetingName(input.customerName);
  const receiver = orderGreetingName(input.customerName) ?? '';
  const address = shortAddress(
    input.wardName,
    input.districtName,
    input.provinceName,
  );
  const methodLabel =
    input.payment.kind === 'COD' ? COD_METHOD_LABEL : ONLINE_METHOD_LABEL;
  const total = formatVnd(input.totalAmount);
  const threshold = normalizeThreshold(input.freeShippingThreshold);

  const deliveryHtml = [
    receiver
      ? `<strong style="color:#1A1A1A">${escapeHtml(receiver)}</strong>`
      : '',
    address ? escapeHtml(address) : '',
  ]
    .filter(Boolean)
    .join('<br>');

  const html = `${mailHead(subject)}${preheaderBlock(`Đơn hàng #${input.code} đã được ghi nhận — tổng cộng ${total}.`)}
${CARD_OPEN}
${topBar(threshold)}
${brandHeader(links.home)}
<tr><td class="em-px"  style="padding:6px 40px 0"><p style="margin:0 0 14px;font-family:${FONT_SERIF};font-style:italic;font-size:17px;line-height:1.4;color:#8C6A45">Cảm ơn bạn đã tin chọn MONO STUDIO</p><h1 class="em-h1" style="margin:0;font-family:${FONT_HEAD};font-weight:800;font-size:32px;line-height:1.06;letter-spacing:-0.02em;text-transform:uppercase;color:#1A1A1A">Đơn hàng của bạn<br>đã được ghi nhận</h1></td></tr>
${spacer(18)}
${paragraph(escapeHtml(greetingSentence(greetingName)))}
${spacer(32)}
${progressBar([
  { label: 'Đã đặt hàng', done: true },
  { label: 'Xác nhận', done: false },
  { label: 'Đang giao', done: false },
  { label: 'Hoàn thành', done: false },
])}
${spacer(32)}
${infoBox(input.code, input.createdAt)}
${paymentNotice(input.payment, links)}
${spacer(40)}
<tr><td class="em-px"  style="padding:0 40px"><p style="margin:0 0 16px;font-family:${FONT_HEAD};font-weight:700;font-size:15px;letter-spacing:0.12em;text-transform:uppercase;color:#1A1A1A">Sản phẩm</p>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">${input.items.map(itemRowWithImage).join('\n')}
<tr><td style="border-top:1px solid #E6E1D8;font-size:0;line-height:0;height:12px">&nbsp;</td></tr></table>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
${summaryRows(input)}
<tr><td colspan="2" style="padding:10px 0 0"><table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0"><tr><td style="padding-top:16px;border-top:1px solid #E6E1D8;font-family:${FONT_BODY};font-weight:600;font-size:15px;color:#1A1A1A">Tổng cộng</td><td align="right" style="padding-top:16px;border-top:1px solid #E6E1D8;font-family:${FONT_HEAD};font-weight:800;font-size:28px;line-height:1.1;letter-spacing:-0.01em;color:#1A1A1A">${escapeHtml(total)}</td></tr></table></td></tr></table></td></tr>
${spacer(36)}
<tr><td class="em-px"  style="padding:0 40px"><table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0"><tr>${infoCard('Giao hàng tới', deliveryHtml, 'padding:0 7px 0 0')}${infoCard('Thanh toán', escapeHtml(methodLabel), 'padding:0 0 0 7px')}</tr></table></td></tr>
${spacer(40)}
${primaryButton(links.orderDetail, 'Xem đơn hàng')}
${spacer(48)}
${footer(links, REASON_TEXT)}
${CARD_CLOSE}`;

  const textLines: string[] = [
    greetingSentence(greetingName),
    '',
    `Mã đơn hàng: #${input.code}`,
    `Ngày đặt: ${formatVnDateTime(input.createdAt)}`,
  ];
  if (input.payment.kind === 'ONLINE_PENDING') {
    textLines.push(
      '',
      `${PENDING_TITLE} ${pendingSentence(input.payment.expiresAt)}`,
      `Thanh toán ngay: ${links.onlinePayment}`,
    );
  } else if (input.payment.kind === 'ONLINE_PAID') {
    textLines.push('', `${PAID_TITLE} ${PAID_DETAIL}`);
  }
  textLines.push(
    '',
    'Sản phẩm:',
    ...itemTextLines(input.items),
    '',
    ...summaryTextLines(input),
    `Tổng cộng: ${total}`,
    '',
    `Giao hàng tới: ${[receiver, address].filter(Boolean).join(', ')}`,
    `Thanh toán: ${methodLabel}`,
    '',
    `Xem đơn hàng: ${links.orderDetail}`,
  );
  if (threshold !== null) {
    textLines.push(
      '',
      `Miễn phí vận chuyển cho đơn từ ${formatVnd(threshold)}.`,
    );
  }
  textLines.push('', ...footerTextLines(links, REASON_TEXT));

  return { subject, html, text: textLines.join('\n') };
}
