import { IsNotEmpty, IsString, IsUrl, MaxLength } from 'class-validator';
import { Trim } from '../../common/transforms/trim';

// Số ảnh tối đa mỗi sản phẩm
export const MAX_PRODUCT_IMAGES = 6;
// Cột ProductImage.url là VARCHAR(500)
export const MAX_IMAGE_URL_LENGTH = 500;

// Một phần tử trong `images`; vị trí trong mảng chính là thứ tự hiển thị (sortOrder), ảnh đầu là ảnh đại diện.
export class ProductImageDto {
  @Trim()
  @IsString({ message: 'Đường dẫn ảnh phải là chuỗi' })
  @IsNotEmpty({ message: 'Đường dẫn ảnh không được để trống' })
  @MaxLength(MAX_IMAGE_URL_LENGTH, {
    message: `Đường dẫn ảnh không được vượt quá ${MAX_IMAGE_URL_LENGTH} ký tự`,
  })
  // require_tld: false để nhận URL ảnh upload ở dev, vd http://localhost:3000/uploads/...
  @IsUrl(
    {
      protocols: ['http', 'https'],
      require_protocol: true,
      require_tld: false,
    },
    {
      message:
        'Đường dẫn ảnh không hợp lệ, phải bắt đầu bằng http:// hoặc https://',
    },
  )
  url: string;
}
