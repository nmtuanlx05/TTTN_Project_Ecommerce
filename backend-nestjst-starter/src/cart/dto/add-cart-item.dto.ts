import { IsInt, Max, Min } from 'class-validator';
import { MAX_QUANTITY_PER_ITEM } from '../cart.constants';

export class AddCartItemDto {
  @IsInt({ message: 'Mã biến thể phải là số nguyên' })
  @Min(1, { message: 'Mã biến thể không hợp lệ' })
  variantId: number;

  // Số lượng thêm vào; nếu biến thể đã có trong giỏ thì cộng dồn
  @IsInt({ message: 'Số lượng phải là số nguyên' })
  @Min(1, { message: `Số lượng phải từ 1 đến ${MAX_QUANTITY_PER_ITEM}` })
  @Max(MAX_QUANTITY_PER_ITEM, {
    message: `Số lượng phải từ 1 đến ${MAX_QUANTITY_PER_ITEM}`,
  })
  quantity: number;
}
