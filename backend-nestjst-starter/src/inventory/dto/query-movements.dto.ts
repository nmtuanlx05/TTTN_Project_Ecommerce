import { Type } from 'class-transformer';
import { IsInt, IsOptional, Max, Min } from 'class-validator';

// Lịch sử luôn sắp mới nhất trước nên chỉ có phân trang
export class QueryMovementsDto {
  // Trang hiện tại, bắt đầu từ 1
  @IsOptional()
  @Type(() => Number)
  @IsInt({ message: 'page phải là số nguyên' })
  @Min(1, { message: 'page phải lớn hơn hoặc bằng 1' })
  page: number = 1;

  // Số bản ghi mỗi trang, tối đa 100
  @IsOptional()
  @Type(() => Number)
  @IsInt({ message: 'limit phải là số nguyên' })
  @Min(1, { message: 'limit phải lớn hơn hoặc bằng 1' })
  @Max(100, { message: 'limit không được vượt quá 100' })
  limit: number = 10;
}
