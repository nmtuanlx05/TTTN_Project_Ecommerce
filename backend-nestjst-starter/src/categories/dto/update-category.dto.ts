import { PartialType, PickType } from '@nestjs/mapped-types';
import { CreateCategoryDto } from './create-category.dto';

// Cho sửa name, parentId, slug; parentId = null để đưa danh mục về gốc.
export class UpdateCategoryDto extends PartialType(
  PickType(CreateCategoryDto, ['name', 'parentId', 'slug'] as const),
) {}
