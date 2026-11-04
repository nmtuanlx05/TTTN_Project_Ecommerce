import { IsInt, Max, Min } from 'class-validator';
import { MAX_QUANTITY_PER_ITEM } from '../cart.constants';

export class UpdateCartItemDto {
  // Số lượng tuyệt đối của dòng giỏ (không cộng dồn)
  @IsInt({ message: 'Số lượng phải là số nguyên' })
  @Min(1, { message: `Số lượng phải từ 1 đến ${MAX_QUANTITY_PER_ITEM}` })
  @Max(MAX_QUANTITY_PER_ITEM, {
    message: `Số lượng phải từ 1 đến ${MAX_QUANTITY_PER_ITEM}`,
  })
  quantity: number;
}
