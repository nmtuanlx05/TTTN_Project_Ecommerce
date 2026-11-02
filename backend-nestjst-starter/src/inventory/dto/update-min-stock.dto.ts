import { IsInt, Max, Min } from 'class-validator';
import { MAX_STOCK } from '../inventory.constants';

export class UpdateMinStockDto {
  // Ngưỡng cảnh báo sắp hết: biến thể có tồn khả dụng <= ngưỡng (và > 0) là "low"
  @IsInt({ message: 'Ngưỡng tồn tối thiểu phải là số nguyên' })
  @Min(0, { message: 'Ngưỡng tồn tối thiểu không được âm' })
  @Max(MAX_STOCK, {
    message: `Ngưỡng tồn tối thiểu không được vượt quá ${MAX_STOCK}`,
  })
  minStock: number;
}
