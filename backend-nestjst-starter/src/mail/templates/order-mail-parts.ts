import { escapeHtml, toSafeHttpUrl } from '../escape-html';
import { emailImageUrl } from '../email-image-url';
import { parseFrontendUrl } from '../mail.config';
import { resolveGreetingName } from './greeting-name';
import { formatVnd } from './mail-format';

// Phần dùng chung của hai thư đơn hàng (xác nhận đơn, đã nhận thanh toán). Hàm thuần, trả HTML đã escape.
// Hằng số font, HEAD (CSS, meta) và khung bảng (topBar, đầu thư, nút, chân thư) CHÉP TỪ welcome.template.ts:
// ĐỒNG BỘ TAY với welcome.template.ts khi sửa giao diện chung. Cố ý chưa tách renderWelcome để không đổi HTML thư đang chạy.

export const BRAND = 'MONO STUDIO';
export const TAGLINE = 'Thời trang tối giản cho cuộc sống hiện đại.';
export const ONLINE_METHOD_LABEL = 'Chuyển khoản QR ngân hàng';
export const COD_METHOD_LABEL = 'Thanh toán khi nhận hàng';

export const FONT_BODY =
  "'Be Vietnam Pro','Helvetica Neue',Helvetica,Arial,sans-serif";
export const FONT_HEAD =
  "'Archivo','Helvetica Neue',Helvetica,Arial,sans-serif";
export const FONT_SERIF = "'Newsreader',Georgia,'Times New Roman',serif";

// Một dòng hàng lấy từ snapshot order_items (không join lại bảng sản phẩm)
export interface OrderMailItem {
  productName: string;
  size: string;
  color: string;
  quantity: number;
  // Đơn giá lúc mua (VND)
  price: number;
  // order_items.imageUrl; không có/không phải https thì dòng chỉ hiện chữ
  imageUrl?: string | null;
}

// Dữ liệu chung, đều là giá trị ĐÃ LƯU trong đơn (không tính lại tiền)
export interface OrderMailCommon {
  code: string;
  // Tên người nhận (orders.customerName); rỗng thì chào "bạn"
  customerName: string | null | undefined;
  items: OrderMailItem[];
  subtotal: number;
  discountAmount: number;
  voucherCode: string | null;
  shippingFee: number;
  totalAmount: number;
  // FRONTEND_URL (địa chỉ trang web); dấu / cuối được bỏ
  frontendUrl: string;
  // Ngưỡng miễn phí vận chuyển (VND); null hoặc <= 0 thì bỏ thanh trên cùng
  freeShippingThreshold: number | null;
}

export interface OrderMailLinks {
  home: string;
  products: string;
  myOrders: string;
  orderDetail: string;
  onlinePayment: string;
}

// Ném lỗi nếu FRONTEND_URL sai (cấu hình sai thì không gửi thư có link hỏng), giống renderWelcome
export function buildOrderLinks(
  frontendUrl: string,
  code: string,
): OrderMailLinks {
  const shop = parseFrontendUrl(frontendUrl);
  const encoded = encodeURIComponent(code);
  const links = {
    home: toSafeHttpUrl(shop),
    products: toSafeHttpUrl(`${shop}/products`),
    myOrders: toSafeHttpUrl(`${shop}/tai-khoan/don-hang`),
    orderDetail: toSafeHttpUrl(`${shop}/tai-khoan/don-hang/${encoded}`),
    onlinePayment: toSafeHttpUrl(`${shop}/thanh-toan-online/${encoded}`),
  };
  for (const value of Object.values(links)) {
    if (!value) {
      throw new Error(
        'Địa chỉ trang web không hợp lệ để dựng liên kết trong mail.',
      );
    }
  }
  return links as OrderMailLinks;
}

// Tên trong lời chào: customerName là tên người nhận khách tự nhập (không phải tên BE tự đặt từ email),
// nên không so với email (truyền chuỗi rỗng). Trả chuỗi THÔ hoặc null (chào "bạn").
export function orderGreetingName(name: string | null | undefined) {
  return resolveGreetingName(name, '');
}

// Tiêu đề thư là header: bỏ ký tự điều khiển/xuống dòng trong giá trị chèn vào
export function subjectSafe(value: string): string {
  return value.replace(/[\p{Cc}]+/gu, ' ').trim();
}

export function normalizeThreshold(value: number | null): number | null {
  return value !== null && Number.isFinite(value) && value > 0 ? value : null;
}

// Địa chỉ rút gọn: các cấp hành chính có giá trị (phường/xã, quận/huyện, tỉnh/thành), KHÔNG số nhà.
// Dữ liệu chuẩn cũ 3 cấp: 5 huyện đảo không có phường/xã; đơn cũ có thể thiếu cả quận/huyện.
export function shortAddress(...parts: (string | null | undefined)[]): string {
  return parts
    .map((part) => (part ?? '').replace(/[\p{Cc}\s]+/gu, ' ').trim())
    .filter((part) => part !== '')
    .join(', ');
}

export const variantLabel = (item: OrderMailItem) =>
  `${item.size} / ${item.color}`;
export const lineTotal = (item: OrderMailItem) => item.price * item.quantity;
export const shippingLabel = (fee: number) =>
  fee === 0 ? 'Miễn phí' : formatVnd(fee);
export const discountLabel = (voucherCode: string | null) =>
  voucherCode ? `Giảm giá (${voucherCode})` : 'Giảm giá';

// ===== Khung HTML (chép từ welcome.template.ts) =====

export function mailHead(title: string): string {
  return `<!doctype html>
<html lang="vi" xmlns="http://www.w3.org/1999/xhtml">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="x-apple-disable-message-reformatting">
<meta name="format-detection" content="telephone=no,address=no,email=no,date=no,url=no">
<title>${escapeHtml(title)}</title>
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Archivo:wght@500;600;700;800&family=Be+Vietnam+Pro:wght@300;400;500;600&family=Newsreader:ital,wght@1,400&display=swap">
<style>
body { margin: 0; padding: 0; background: #EFEBE3; -webkit-text-size-adjust: 100%; }
table { border-spacing: 0; }
img { -ms-interpolation-mode: bicubic; }

.em-btn:hover { opacity: 0.86; }
@media only screen and (max-width: 620px) {
  .em-wrap { width: 100% !important; }
  .em-px { padding-left: 22px !important; padding-right: 22px !important; }
  .em-h1 { font-size: 28px !important; }
  .em-stack { display: block !important; width: 100% !important; padding-left: 0 !important; padding-right: 0 !important; }
  .em-gap-b { padding-bottom: 18px !important; }
  .em-gap { display: none !important; }
  .em-tile { padding-bottom: 20px !important; }
  .em-fluid { width: 100% !important; height: auto !important; }
}
</style>
</head>
<body style="margin:0;padding:0;background:#EFEBE3">
`;
}

export const spacer = (height: number) =>
  `<tr><td height="${height}" style="height:${height}px;font-size:0;line-height:0">&nbsp;</td></tr>`;

// Văn bản ẩn làm đoạn xem trước trong danh sách thư; phần đệm đẩy chữ khác ra khỏi đoạn xem trước
export function preheaderBlock(text: string): string {
  const filler = '&zwnj;&nbsp;'.repeat(70);
  return `<div style="display:none;max-height:0;overflow:hidden;opacity:0;mso-hide:all;font-size:1px;line-height:1px;color:#EFEBE3">${escapeHtml(text)}${filler}</div>`;
}

// Mở khung ngoài + thẻ thư 600px (không có dòng "xem trên trình duyệt")
export const CARD_OPEN = `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" bgcolor="#EFEBE3" style="background:#EFEBE3"><tr><td align="center" style="padding:24px 12px 44px">
<table role="presentation" class="em-wrap" width="600" cellpadding="0" cellspacing="0" border="0" bgcolor="#FBF9F5" style="width:600px;max-width:600px;background:#FBF9F5;border-collapse:separate;border-radius:24px;overflow:hidden">`;

export const CARD_CLOSE = `</table>
</td></tr></table>
</body>
</html>
`;

// Thanh trên cùng: chỉ "Miễn phí vận chuyển từ <ngưỡng>" (không hứa đổi trả)
export function topBar(threshold: number | null): string {
  if (threshold === null) return '';
  return `<tr><td align="center" bgcolor="#242120" style="padding:11px 20px;font-family:${FONT_HEAD};font-weight:600;font-size:10.5px;line-height:1.4;letter-spacing:0.14em;text-transform:uppercase;color:#E9E4DA">Miễn phí vận chuyển từ ${escapeHtml(formatVnd(threshold))}</td></tr>`;
}

// Tên thương hiệu (không có hàng menu danh mục)
export function brandHeader(homeUrl: string): string {
  return `<tr><td align="center" style="padding:36px 40px 34px"><a href="${escapeHtml(homeUrl)}" style="font-family:${FONT_HEAD};font-weight:800;font-size:19px;line-height:1;letter-spacing:0.28em;color:#1A1A1A;text-decoration:none">${BRAND}</a></td></tr>`;
}

// Một đoạn văn thường trong lề 40px; `html` phải ĐÃ escape
export function paragraph(html: string, extraStyle = ''): string {
  return `<tr><td class="em-px"  style="padding:0 40px"><p style="margin:0;font-family:${FONT_BODY};font-weight:400;font-size:15px;line-height:1.75;color:#4A4742;${extraStyle}">${html}</p></td></tr>`;
}

// Thanh tiến trình theo các bước có thật của đơn; `done` tô đậm
export function progressBar(steps: { label: string; done: boolean }[]) {
  const gap = '<td width="6" style="width:6px;font-size:0">&nbsp;</td>';
  const bars = steps
    .map(
      (step) =>
        `<td height="4" style="height:4px;font-size:0;line-height:0;background:${step.done ? '#242120' : '#E0DACE'};border-radius:4px">&nbsp;</td>`,
    )
    .join(gap);
  const labels = steps
    .map(
      (step) =>
        `<td valign="top" style="padding-top:10px;font-family:${FONT_BODY};font-weight:${step.done ? 600 : 400};font-size:11px;line-height:1.4;color:${step.done ? '#1A1A1A' : '#6B6760'}">${escapeHtml(step.label)}</td>`,
    )
    .join(gap);
  return `<tr><td class="em-px"  style="padding:0 40px"><table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0"><tr>${bars}</tr>
<tr>${labels}</tr></table></td></tr>`;
}

// Hàng tiền (nhãn trái, số phải); hai giá trị đều là chữ THÔ, hàm tự escape
export function moneyRow(label: string, value: string, valueStyle = '') {
  const cell = `padding:6px 0;font-family:${FONT_BODY};font-size:14px;line-height:1.5;color:#4A4742;`;
  return `<tr><td style="${cell}">${escapeHtml(label)}</td><td align="right" style="${cell}${valueStyle}">${escapeHtml(value)}</td></tr>`;
}

// Tạm tính, giảm giá (chỉ khi > 0), vận chuyển: dùng chung cho hai thư
export function summaryRows(input: OrderMailCommon): string {
  const rows = [moneyRow('Tạm tính', formatVnd(input.subtotal))];
  if (input.discountAmount > 0) {
    rows.push(
      moneyRow(
        discountLabel(input.voucherCode),
        formatVnd(-input.discountAmount),
        'color:#4F6F4B;font-weight:600;',
      ),
    );
  }
  rows.push(
    moneyRow(
      'Vận chuyển',
      shippingLabel(input.shippingFee),
      'font-weight:600;',
    ),
  );
  return rows.join('\n');
}

// Dòng hàng của thư xác nhận đơn: ảnh 84x105 (nếu có URL https hợp lệ), tên, "size / màu · Số lượng", thành tiền dòng.
// Không có ảnh: bỏ hẳn ô ảnh (không thẻ <img> rỗng), chữ dồn sang trái.
export function itemRowWithImage(item: OrderMailItem): string {
  const image = emailImageUrl(item.imageUrl);
  const imageCell = image
    ? `<td width="84" valign="top" style="width:84px"><img src="${escapeHtml(image)}" width="84" height="105" alt="${escapeHtml(item.productName)}" style="display:block;width:84px;height:105px;border:0;border-radius:14px;object-fit:cover;"></td>`
    : '';
  const textPadding = image ? '2px 16px 0 18px' : '2px 16px 0 0';
  return `<tr><td style="padding:18px 0;border-top:1px solid #E6E1D8"><table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0"><tr>
${imageCell}<td valign="top" style="padding:${textPadding}"><p style="margin:0;font-family:${FONT_BODY};font-weight:600;font-size:15px;line-height:1.4;color:#1A1A1A">${escapeHtml(item.productName)}</p><p style="margin:5px 0 0;font-family:${FONT_BODY};font-size:13px;line-height:1.6;color:#6B6760">${escapeHtml(variantLabel(item))} &nbsp;&middot;&nbsp; Số lượng: ${item.quantity}</p></td>
<td valign="top" align="right" style="padding-top:2px;white-space:nowrap;font-family:${FONT_BODY};font-weight:600;font-size:15px;line-height:1.4;color:#1A1A1A">${escapeHtml(formatVnd(lineTotal(item)))}</td>
</tr></table></td></tr>`;
}

// Dòng hàng gọn (thư đã nhận thanh toán): "Tên · size / màu × SL" và thành tiền dòng, không ảnh
export function itemRowCompact(item: OrderMailItem): string {
  return `<tr><td style="padding:9px 0;font-family:${FONT_BODY};font-size:14px;line-height:1.5;color:#4A4742">${escapeHtml(item.productName)} <span style="color:#6B6760">&middot; ${escapeHtml(variantLabel(item))} &times; ${item.quantity}</span></td><td align="right" valign="top" style="padding:9px 0 9px 16px;white-space:nowrap;font-family:${FONT_BODY};font-size:14px;line-height:1.5;color:#1A1A1A">${escapeHtml(formatVnd(lineTotal(item)))}</td></tr>`;
}

// Nút chính (nền đen, bo tròn); href phải là URL đã kiểm (http/https)
export function primaryButton(href: string, label: string): string {
  return `<tr><td class="em-px"  style="padding:0 40px"><table role="presentation" cellpadding="0" cellspacing="0" border="0" style="border-collapse:separate"><tr>
<td align="center" bgcolor="#242120" style="border-radius:999px;border:1.5px solid #242120">
<a class="em-btn" href="${escapeHtml(href)}" style="display:inline-block;padding:17px 34px;font-family:${FONT_HEAD};font-weight:700;font-size:12.5px;line-height:1;letter-spacing:0.14em;text-transform:uppercase;color:#FBF9F5;text-decoration:none;border-radius:999px">${escapeHtml(label)}</a>
</td></tr></table></td></tr>`;
}

// Chân thư: thương hiệu, menu "Sản phẩm · Đơn hàng của tôi", lý do nhận thư, bản quyền (không năm, không địa chỉ công ty)
export function footer(links: OrderMailLinks, reason: string): string {
  const linkStyle = 'color:#E9E4DA;text-decoration:none';
  return `<tr><td class="em-px" align="center" bgcolor="#242120" style="padding:48px 40px 40px">
<p style="margin:0;font-family:${FONT_HEAD};font-weight:800;font-size:16px;line-height:1;letter-spacing:0.28em;color:#FBF9F5">${BRAND}</p>
<p style="margin:14px 0 0;font-family:${FONT_SERIF};font-style:italic;font-size:17px;line-height:1.5;color:#C9B79C">${TAGLINE}</p>
<p style="margin:26px 0 0;font-family:${FONT_BODY};font-weight:500;font-size:11px;line-height:1.4;letter-spacing:0.16em;text-transform:uppercase;color:#E9E4DA"><a href="${escapeHtml(links.products)}" style="${linkStyle}">Sản phẩm</a> &nbsp;&middot;&nbsp; <a href="${escapeHtml(links.myOrders)}" style="${linkStyle}">Đơn hàng của tôi</a></p>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin-top:30px"><tr><td height="1" style="height:1px;font-size:0;line-height:0;background:#3A3532">&nbsp;</td></tr></table>
<p style="margin:26px 0 0;font-family:${FONT_BODY};font-weight:400;font-size:12px;line-height:1.8;color:#A8A196">${escapeHtml(reason)}</p>
<p style="margin:10px 0 0;font-family:${FONT_BODY};font-weight:400;font-size:12px;line-height:1.8;color:#A8A196">Bản quyền &copy; ${BRAND}.</p>
</td></tr>`;
}

// ===== Bản text thuần =====

export function itemTextLines(items: OrderMailItem[]): string[] {
  return items.map(
    (item) =>
      `- ${item.productName} (${variantLabel(item)}) x ${item.quantity}: ${formatVnd(lineTotal(item))}`,
  );
}

export function summaryTextLines(input: OrderMailCommon): string[] {
  const lines = [`Tạm tính: ${formatVnd(input.subtotal)}`];
  if (input.discountAmount > 0) {
    lines.push(
      `${discountLabel(input.voucherCode)}: ${formatVnd(-input.discountAmount)}`,
    );
  }
  lines.push(`Vận chuyển: ${shippingLabel(input.shippingFee)}`);
  return lines;
}

export function footerTextLines(
  links: OrderMailLinks,
  reason: string,
): string[] {
  return [
    `Sản phẩm: ${links.products}`,
    `Đơn hàng của tôi: ${links.myOrders}`,
    '',
    reason,
    `Bản quyền © ${BRAND}.`,
  ];
}
