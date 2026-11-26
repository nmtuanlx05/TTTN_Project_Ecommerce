import { escapeHtml } from '../escape-html';
import { formatVnd, formatVnDateTime } from './mail-format';
import {
  brandHeader,
  buildOrderLinks,
  CARD_CLOSE,
  CARD_OPEN,
  FONT_BODY,
  FONT_HEAD,
  FONT_SERIF,
  footer,
  footerTextLines,
  itemRowCompact,
  itemTextLines,
  mailHead,
  normalizeThreshold,
  ONLINE_METHOD_LABEL,
  type OrderMailCommon,
  orderGreetingName,
  paragraph,
  preheaderBlock,
  primaryButton,
  progressBar,
  spacer,
  subjectSafe,
  summaryRows,
  summaryTextLines,
  topBar,
} from './order-mail-parts';
import type { RenderedOrderMail } from './order-confirmation.template';

// Thư "Đã nhận thanh toán" (chỉ đơn ONLINE chuyển khoản QR). Hàm TypeScript thuần. Bản thiết kế gốc:
// docs/mail-templates/payment-confirmation.html. So với thiết kế: bỏ "Đổi trả trong 30 ngày", menu danh mục, "Xem trên trình duyệt",
// "Hỗ trợ", địa chỉ công ty, năm bản quyền, dòng "Mã giao dịch" và "Dự kiến giao", câu hứa "1–2 ngày làm việc" (thay bằng
// "Đơn hàng đang chờ cửa hàng xác nhận"), câu mời trả lời email. "Số tiền đã thanh toán" là totalAmount của đơn, KHÔNG phải
// số tiền khách chuyển (thừa tiền thì Admin xử lý ngoài hệ thống, thư không nhắc). Mọi giá trị chèn vào HTML đều qua escapeHtml.

export interface PaymentReceivedInput extends OrderMailCommon {
  // orders.paidAt
  paidAt: Date;
}

const REASON_TEXT =
  'Email này được gửi tự động vì bạn vừa thanh toán đơn hàng tại MONO STUDIO.';
const NEXT_STEP = 'Đơn hàng đang chờ cửa hàng xác nhận.';
const NOT_INVOICE = 'Email này là xác nhận thanh toán, không phải hóa đơn VAT.';

export const paymentReceivedSubject = (code: string) =>
  `MONO STUDIO · Đã nhận thanh toán cho đơn hàng #${subjectSafe(code)}`;

function detailRow(label: string, value: string, last: boolean): string {
  const border = last ? '' : 'border-bottom:1px solid #E0DACE;';
  return `<tr><td valign="top" style="padding:13px 0;${border}font-family:${FONT_BODY};font-size:13.5px;line-height:1.5;color:#6B6760">${escapeHtml(label)}</td><td valign="top" align="right" style="padding:13px 0 13px 16px;${border}font-family:${FONT_BODY};font-weight:600;font-size:13.5px;line-height:1.5;color:#1A1A1A">${escapeHtml(value)}</td></tr>`;
}

export function renderPaymentReceived(
  input: PaymentReceivedInput,
): RenderedOrderMail {
  const links = buildOrderLinks(input.frontendUrl, input.code);
  const subject = paymentReceivedSubject(input.code);
  const name = orderGreetingName(input.customerName);
  const amount = formatVnd(input.totalAmount);
  const paidAt = formatVnDateTime(input.paidAt);
  const threshold = normalizeThreshold(input.freeShippingThreshold);
  const thanks = `Cảm ơn ${name ?? 'bạn'}!`;

  const html = `${mailHead(subject)}${preheaderBlock(`Đã nhận thanh toán ${amount} cho đơn hàng #${input.code}.`)}
${CARD_OPEN}
${topBar(threshold)}
${brandHeader(links.home)}
<tr><td class="em-px"  style="padding:0 40px"><table role="presentation" cellpadding="0" cellspacing="0" border="0"><tr><td align="center" valign="middle" width="64" height="64" bgcolor="#E7EFE5" style="width:64px;height:64px;border-radius:50%;background:#E7EFE5;font-family:${FONT_HEAD};font-weight:800;font-size:28px;line-height:64px;color:#4F6F4B">&#10003;</td></tr></table></td></tr>
${spacer(24)}
<tr><td class="em-px"  style="padding:0 40px"><p style="margin:0 0 14px;font-family:${FONT_SERIF};font-style:italic;font-size:17px;line-height:1.4;color:#8C6A45">Thanh toán thành công</p><h1 class="em-h1" style="margin:0;font-family:${FONT_HEAD};font-weight:800;font-size:32px;line-height:1.06;letter-spacing:-0.02em;text-transform:uppercase;color:#1A1A1A">Chúng mình đã nhận<br>được thanh toán</h1></td></tr>
${spacer(18)}
${paragraph(`${escapeHtml(thanks)} Khoản thanh toán cho đơn hàng <strong style="color:#1A1A1A">#${escapeHtml(input.code)}</strong> đã được ghi nhận. ${escapeHtml(NEXT_STEP)}`)}
${spacer(32)}
${progressBar([
  { label: 'Đã đặt hàng', done: true },
  { label: 'Đã thanh toán', done: true },
  { label: 'Xác nhận', done: false },
  { label: 'Đang giao', done: false },
  { label: 'Hoàn thành', done: false },
])}
${spacer(32)}
<tr><td class="em-px"  style="padding:0 40px"><table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" bgcolor="#E7EFE5" style="background:#E7EFE5;border-radius:24px;border-collapse:separate"><tr><td align="center" style="padding:32px 24px">
<p style="margin:0;font-family:${FONT_BODY};font-weight:600;font-size:10.5px;line-height:1.4;letter-spacing:0.16em;text-transform:uppercase;color:#4F6F4B">Số tiền đã thanh toán</p>
<p style="margin:10px 0 0;font-family:${FONT_HEAD};font-weight:800;font-size:44px;line-height:1.1;letter-spacing:-0.02em;color:#1A1A1A">${escapeHtml(amount)}</p>
<table role="presentation" cellpadding="0" cellspacing="0" border="0" style="margin:16px auto 0;border-collapse:separate"><tr><td align="center" bgcolor="#FBF9F5" style="padding:6px 16px;border-radius:999px;font-family:${FONT_BODY};font-weight:600;font-size:12px;line-height:1.4;color:#3F5B3C"><span style="color:#6F8F6B;font-size:13px">&#9679;</span>&nbsp; Đã thanh toán</td></tr></table>
</td></tr></table></td></tr>
${spacer(32)}
<tr><td class="em-px"  style="padding:0 40px"><table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" bgcolor="#F3EFE8" style="background:#F3EFE8;border-radius:24px;border-collapse:separate"><tr><td style="padding:26px 28px 14px"><p style="margin:0;font-family:${FONT_BODY};font-weight:600;font-size:10.5px;line-height:1.4;letter-spacing:0.16em;text-transform:uppercase;color:#8C6A45">Chi tiết giao dịch</p></td></tr>
<tr><td style="padding:0 28px 14px"><table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
${detailRow('Mã đơn hàng', `#${input.code}`, false)}
${detailRow('Phương thức', ONLINE_METHOD_LABEL, false)}
${detailRow('Thời gian', paidAt, true)}
</table></td></tr></table></td></tr>
${spacer(36)}
<tr><td class="em-px"  style="padding:0 40px"><p style="margin:0 0 8px;font-family:${FONT_HEAD};font-weight:700;font-size:15px;letter-spacing:0.12em;text-transform:uppercase;color:#1A1A1A">Tóm tắt đơn hàng</p>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">${input.items.map(itemRowCompact).join('\n')}</table>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin-top:8px;border-top:1px solid #E6E1D8">
${summaryRows(input)}
<tr><td style="padding:6px 0;font-family:${FONT_BODY};line-height:1.5;color:#1A1A1A;font-weight:600;font-size:15px;">Đã thanh toán</td><td align="right" style="padding:6px 0;font-family:${FONT_BODY};font-size:14px;line-height:1.5;color:#1A1A1A;">${escapeHtml(amount)}</td></tr>
</table></td></tr>
${spacer(38)}
${primaryButton(links.orderDetail, 'Xem đơn hàng')}
${spacer(22)}
${paragraph(escapeHtml(NOT_INVOICE), 'font-size:13px;color:#6B6760')}
${spacer(48)}
${footer(links, REASON_TEXT)}
${CARD_CLOSE}`;

  const textLines: string[] = [
    `${thanks} Khoản thanh toán cho đơn hàng #${input.code} đã được ghi nhận. ${NEXT_STEP}`,
    '',
    `Số tiền đã thanh toán: ${amount}`,
    `Mã đơn hàng: #${input.code}`,
    `Phương thức: ${ONLINE_METHOD_LABEL}`,
    `Thời gian: ${paidAt}`,
    '',
    'Tóm tắt đơn hàng:',
    ...itemTextLines(input.items),
    '',
    ...summaryTextLines(input),
    `Đã thanh toán: ${amount}`,
    '',
    `Xem đơn hàng: ${links.orderDetail}`,
    '',
    NOT_INVOICE,
  ];
  if (threshold !== null) {
    textLines.push(
      '',
      `Miễn phí vận chuyển cho đơn từ ${formatVnd(threshold)}.`,
    );
  }
  textLines.push('', ...footerTextLines(links, REASON_TEXT));

  return { subject, html, text: textLines.join('\n') };
}
