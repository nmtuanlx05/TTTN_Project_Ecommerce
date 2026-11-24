import { escapeHtml, toSafeHttpsUrl, toSafeHttpUrl } from '../escape-html';
import { parseFrontendUrl } from '../mail.config';
import { resolveGreetingName } from './greeting-name';
import { formatVnd, formatVnDate } from './mail-format';

// Mẫu mail chào mừng: hàm TypeScript thuần (không engine template). Bản thiết kế gốc: docs/mail-templates/welcome.design.html.
// Chỉ nói điều hệ thống làm thật: không "đơn đầu tiên", không "quà riêng" (voucher là mã công khai dùng chung),
// không đổi trả/hỗ trợ/hủy nhận email. Mọi giá trị chèn vào HTML đều qua escapeHtml; URL phải là http/https.

export const WELCOME_SUBJECT = 'Chào mừng bạn đến với MONO STUDIO';
const PREHEADER =
  'Chào mừng bạn đến với MONO STUDIO — cảm ơn bạn đã tạo tài khoản.';
const BRAND = 'MONO STUDIO';
const TAGLINE = 'Thời trang tối giản cho cuộc sống hiện đại.';
const THANKS =
  'Cảm ơn bạn đã tạo tài khoản. Từ nay, mỗi món đồ chúng mình thiết kế đều hướng tới sự gọn gàng, chất liệu thoáng mát và form chuẩn — dễ phối cho mọi ngày.';
const PAYMENT_TEXT = 'Thanh toán khi nhận hàng hoặc chuyển khoản QR ngân hàng.';
const REASON_TEXT = `Bạn nhận email này vì đã đăng ký tài khoản tại ${BRAND}.`;
const HERO_ALT = 'Bộ sưu tập thời trang tối giản của MONO STUDIO';

// Voucher đã được worker kiểm "còn dùng được"; mẫu chỉ hiển thị
export interface WelcomeVoucher {
  code: string;
  discountType: 'PERCENT' | 'FIXED';
  discountValue: number;
  maxDiscount: number | null;
  minOrderValue: number;
  expiresAt: Date | null;
}

export interface WelcomeInput {
  name: string | null | undefined;
  email: string;
  // FRONTEND_URL (địa chỉ trang web); dấu / cuối được bỏ
  shopUrl: string;
  voucher: WelcomeVoucher | null;
  // Ngưỡng miễn phí vận chuyển (VND); null hoặc <= 0 thì bỏ phần nói về miễn phí vận chuyển
  freeShippingThreshold: number | null;
  // URL https của ảnh hero; rỗng/null/không phải https thì bỏ khối ảnh
  heroImageUrl?: string | null;
}

export interface RenderedMail {
  subject: string;
  html: string;
  text: string;
}

const FONT_BODY =
  "'Be Vietnam Pro','Helvetica Neue',Helvetica,Arial,sans-serif";
const FONT_HEAD = "'Archivo','Helvetica Neue',Helvetica,Arial,sans-serif";
const FONT_SERIF = "'Newsreader',Georgia,'Times New Roman',serif";

const HEAD = `<!doctype html>
<html lang="vi" xmlns="http://www.w3.org/1999/xhtml">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="x-apple-disable-message-reformatting">
<meta name="format-detection" content="telephone=no,address=no,email=no,date=no,url=no">
<title>${escapeHtml(WELCOME_SUBJECT)}</title>
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

const spacer = (height: number) =>
  `<tr><td height="${height}" style="height:${height}px;font-size:0;line-height:0">&nbsp;</td></tr>`;

// Văn bản ẩn hiển thị làm đoạn xem trước trong danh sách thư; phần đệm đẩy chữ khác của thư ra khỏi đoạn xem trước
function preheaderBlock(): string {
  const filler = '&zwnj;&nbsp;'.repeat(70);
  return `<div style="display:none;max-height:0;overflow:hidden;opacity:0;mso-hide:all;font-size:1px;line-height:1px;color:#EFEBE3">${escapeHtml(PREHEADER)}${filler}</div>`;
}

function greetingHeading(greetingName: string | null): string {
  // Có tên: "Xin chào," xuống dòng rồi tên. Không có tên: một dòng "Xin chào bạn."
  const inner =
    greetingName === null
      ? 'Xin chào bạn.'
      : `Xin chào,<br>${escapeHtml(greetingName)}.`;
  return `<h1 class="em-h1" style="margin:0;font-family:${FONT_HEAD};font-weight:800;font-size:40px;line-height:1.06;letter-spacing:-0.02em;text-transform:uppercase;color:#1A1A1A">${inner}</h1>`;
}

function topBar(threshold: number | null): string {
  if (threshold === null) return '';
  return `<tr><td align="center" bgcolor="#242120" style="padding:11px 20px;font-family:${FONT_HEAD};font-weight:600;font-size:10.5px;line-height:1.4;letter-spacing:0.14em;text-transform:uppercase;color:#E9E4DA">Miễn phí vận chuyển từ ${escapeHtml(formatVnd(threshold))}</td></tr>`;
}

function heroBlock(heroUrl: string | null): string {
  if (heroUrl === null) return '';
  return `${spacer(44)}
<tr><td class="em-px"  style="padding:0 40px"><img class="em-fluid" src="${escapeHtml(heroUrl)}" width="520" height="300" alt="${escapeHtml(HERO_ALT)}" style="display:block;width:520px;height:300px;border:0;border-radius:24px;object-fit:cover;width:100%;height:auto;"></td></tr>`;
}

// Dòng mô tả điều kiện, dùng chung cho HTML và text
function voucherLines(voucher: WelcomeVoucher): string[] {
  const label =
    voucher.discountType === 'PERCENT'
      ? `Mã ưu đãi · Giảm ${voucher.discountValue}%`
      : `Mã ưu đãi · Giảm ${formatVnd(voucher.discountValue)}`;
  const min =
    voucher.minOrderValue > 0
      ? `Áp dụng cho đơn từ ${formatVnd(voucher.minOrderValue)}`
      : 'Áp dụng cho mọi đơn hàng';
  // maxDiscount chỉ có nghĩa với PERCENT (FIXED bỏ qua, ghi ra sẽ sai sự thật)
  const max =
    voucher.discountType === 'PERCENT' && voucher.maxDiscount !== null
      ? `, giảm tối đa ${formatVnd(voucher.maxDiscount)}`
      : '';
  const lines = [label, voucher.code, `${min}${max}.`];
  if (voucher.expiresAt) {
    lines.push(`Dùng đến hết ngày ${formatVnDate(voucher.expiresAt)}.`);
  }
  return lines;
}

function voucherBlock(voucher: WelcomeVoucher | null, gapAfterHero: number) {
  if (voucher === null) return '';
  const [label, code, condition, expiry] = voucherLines(voucher);
  const detail = expiry
    ? `${escapeHtml(condition)}<br>${escapeHtml(expiry)}`
    : escapeHtml(condition);
  return `${spacer(gapAfterHero)}
<tr><td class="em-px"  style="padding:0 40px"><table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" bgcolor="#F3EFE8" style="background:#F3EFE8;border:1.5px dashed #BDB3A1;border-radius:22px;border-collapse:separate"><tr><td align="center" style="padding:30px 24px">
<p style="margin:0;font-family:${FONT_BODY};font-weight:600;font-size:10.5px;line-height:1.4;letter-spacing:0.16em;text-transform:uppercase;color:#8C6A45">${escapeHtml(label)}</p>
<p style="margin:12px 0 6px;font-family:${FONT_HEAD};font-weight:800;font-size:32px;line-height:1.1;letter-spacing:0.2em;color:#1A1A1A">${escapeHtml(code)}</p>
<p style="margin:0;font-family:${FONT_BODY};font-size:13px;line-height:1.7;color:#4A4742">${detail}</p>
</td></tr></table></td></tr>`;
}

interface Commitment {
  title: string;
  description: string;
}

function commitmentCell(
  index: number,
  item: Commitment,
  padding: string,
  classes: string,
): string {
  const number = String(index + 1).padStart(2, '0');
  return `<td class="${classes}" width="50%" valign="top" style="${padding}"><table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%"><tr>
<td width="34" valign="top" style="font-family:${FONT_SERIF};font-style:italic;font-size:20px;line-height:1.2;color:#8C6A45">${number}</td>
<td valign="top"><p style="margin:0;font-family:${FONT_HEAD};font-weight:700;font-size:13px;line-height:1.4;letter-spacing:0.04em;text-transform:uppercase;color:#1A1A1A">${escapeHtml(item.title)}</p>
<p style="margin:4px 0 0;font-family:${FONT_BODY};font-size:13px;line-height:1.65;color:#6B6760">${escapeHtml(item.description)}</p></td></tr></table></td>`;
}

function commitments(threshold: number | null): Commitment[] {
  const items: Commitment[] = [];
  if (threshold !== null) {
    items.push({
      title: 'Miễn phí vận chuyển',
      description: `Cho mọi đơn hàng từ ${formatVnd(threshold)}.`,
    });
  }
  items.push({ title: 'Thanh toán linh hoạt', description: PAYMENT_TEXT });
  return items;
}

function commitmentsBlock(items: Commitment[]): string {
  // Xếp hai cột mỗi hàng; hàng cuối không có khoảng đệm dưới
  const rows: string[] = [];
  for (let i = 0; i < items.length; i += 2) {
    const left = items[i];
    const right = items[i + 1];
    const last = i + 2 >= items.length;
    const bottom = last ? '0' : '22px';
    const stackLeft = `em-stack${right ? ' em-gap-b' : ''}`;
    rows.push(
      `<tr>${commitmentCell(i, left, `padding:0 ${right ? '14px' : '0'} ${bottom} 0`, stackLeft)}${
        right
          ? commitmentCell(
              i + 1,
              right,
              `padding:0 0 ${bottom} 14px`,
              'em-stack',
            )
          : ''
      }</tr>`,
    );
  }
  return `<tr><td class="em-px"  style="padding:0 40px"><table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" bgcolor="#F3EFE8" style="background:#F3EFE8;border-radius:24px;border-collapse:separate"><tr><td style="padding:34px 32px 18px"><p style="margin:0 0 14px;font-family:${FONT_SERIF};font-style:italic;font-size:17px;line-height:1.4;color:#8C6A45">Cam kết của chúng mình</p></td></tr>
<tr><td style="padding:0 32px 34px"><table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
${rows.join('\n')}
</table></td></tr></table></td></tr>`;
}

export function renderWelcome(input: WelcomeInput): RenderedMail {
  // Ném lỗi nếu shopUrl không phải http/https hợp lệ (cấu hình sai thì không gửi thư có link hỏng)
  const shop = parseFrontendUrl(input.shopUrl);
  const productsUrl = toSafeHttpUrl(`${shop}/products`);
  const ordersUrl = toSafeHttpUrl(`${shop}/tai-khoan/don-hang`);
  const homeUrl = toSafeHttpUrl(shop);
  if (!productsUrl || !ordersUrl || !homeUrl) {
    throw new Error(
      'Địa chỉ trang web không hợp lệ để dựng liên kết trong mail.',
    );
  }

  const greetingName = resolveGreetingName(input.name, input.email);
  const threshold =
    input.freeShippingThreshold !== null &&
    Number.isFinite(input.freeShippingThreshold) &&
    input.freeShippingThreshold > 0
      ? input.freeShippingThreshold
      : null;
  const heroUrl = input.heroImageUrl
    ? toSafeHttpsUrl(input.heroImageUrl)
    : null;
  const items = commitments(threshold);

  const linkStyle = 'color:#E9E4DA;text-decoration:none';
  const html = `${HEAD}${preheaderBlock()}
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" bgcolor="#EFEBE3" style="background:#EFEBE3"><tr><td align="center" style="padding:24px 12px 44px">
<table role="presentation" class="em-wrap" width="600" cellpadding="0" cellspacing="0" border="0" bgcolor="#FBF9F5" style="width:600px;max-width:600px;background:#FBF9F5;border-collapse:separate;border-radius:24px;overflow:hidden">
${topBar(threshold)}
<tr><td align="center" style="padding:36px 40px 34px"><a href="${escapeHtml(homeUrl)}" style="font-family:${FONT_HEAD};font-weight:800;font-size:19px;line-height:1;letter-spacing:0.28em;color:#1A1A1A;text-decoration:none">${BRAND}</a></td></tr>
<tr><td class="em-px"  style="padding:6px 40px 0"><p style="margin:0 0 14px;font-family:${FONT_SERIF};font-style:italic;font-size:17px;line-height:1.4;color:#8C6A45">Chào mừng bạn đến với ${BRAND}</p>${greetingHeading(greetingName)}</td></tr>
${spacer(18)}
<tr><td class="em-px"  style="padding:0 40px"><p style="margin:0;font-family:${FONT_SERIF};font-style:italic;font-size:21px;line-height:1.45;color:#1A1A1A">${TAGLINE}</p></td></tr>
${spacer(14)}
<tr><td class="em-px"  style="padding:0 40px"><p style="margin:0;font-family:${FONT_BODY};font-weight:400;font-size:15px;line-height:1.75;color:#4A4742;">${escapeHtml(THANKS)}</p></td></tr>
${spacer(28)}
<tr><td class="em-px"  style="padding:0 40px"><table role="presentation" cellpadding="0" cellspacing="0" border="0" style="border-collapse:separate"><tr>
<td align="center" bgcolor="#242120" style="border-radius:999px;border:1.5px solid #242120">
<a class="em-btn" href="${escapeHtml(productsUrl)}" style="display:inline-block;padding:17px 34px;font-family:${FONT_HEAD};font-weight:700;font-size:12.5px;line-height:1;letter-spacing:0.14em;text-transform:uppercase;color:#FBF9F5;text-decoration:none;border-radius:999px">Khám phá bộ sưu tập</a>
</td></tr></table></td></tr>
${heroBlock(heroUrl)}
${voucherBlock(input.voucher, 44)}
${spacer(48)}
${commitmentsBlock(items)}
${spacer(48)}
<tr><td class="em-px" align="center" bgcolor="#242120" style="padding:48px 40px 40px">
<p style="margin:0;font-family:${FONT_HEAD};font-weight:800;font-size:16px;line-height:1;letter-spacing:0.28em;color:#FBF9F5">${BRAND}</p>
<p style="margin:14px 0 0;font-family:${FONT_SERIF};font-style:italic;font-size:17px;line-height:1.5;color:#C9B79C">${TAGLINE}</p>
<p style="margin:26px 0 0;font-family:${FONT_BODY};font-weight:500;font-size:11px;line-height:1.4;letter-spacing:0.16em;text-transform:uppercase;color:#E9E4DA"><a href="${escapeHtml(productsUrl)}" style="${linkStyle}">Sản phẩm</a> &nbsp;&middot;&nbsp; <a href="${escapeHtml(ordersUrl)}" style="${linkStyle}">Đơn hàng của tôi</a></p>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin-top:30px"><tr><td height="1" style="height:1px;font-size:0;line-height:0;background:#3A3532">&nbsp;</td></tr></table>
<p style="margin:26px 0 0;font-family:${FONT_BODY};font-weight:400;font-size:12px;line-height:1.8;color:#A8A196">${escapeHtml(REASON_TEXT)}</p>
<p style="margin:10px 0 0;font-family:${FONT_BODY};font-weight:400;font-size:12px;line-height:1.8;color:#A8A196">Bản quyền &copy; ${BRAND}.</p>
</td></tr>
</table>
</td></tr></table>
</body>
</html>
`;

  const textLines: string[] = [
    greetingName === null ? 'Xin chào bạn.' : `Xin chào, ${greetingName}.`,
    '',
    THANKS,
    '',
    `Khám phá bộ sưu tập: ${productsUrl}`,
  ];
  if (input.voucher) {
    const [label, code, ...rest] = voucherLines(input.voucher);
    textLines.push('', `${label}: ${code}`, ...rest);
  }
  textLines.push('');
  for (const item of items) {
    textLines.push(`${item.title}: ${item.description}`);
  }
  textLines.push(
    '',
    `Sản phẩm: ${productsUrl}`,
    `Đơn hàng của tôi: ${ordersUrl}`,
    '',
    REASON_TEXT,
    `Bản quyền © ${BRAND}.`,
  );

  return { subject: WELCOME_SUBJECT, html, text: textLines.join('\n') };
}
