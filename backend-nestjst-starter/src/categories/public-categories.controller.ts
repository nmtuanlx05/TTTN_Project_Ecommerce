import { Controller, Get } from '@nestjs/common';
import { Public } from '../auth/decorators/public.decorator';
import { CategoriesService } from './categories.service';

// API công khai cho storefront, không cần đăng nhập
@Public()
@Controller('categories')
export class PublicCategoriesController {
  constructor(private readonly categoriesService: CategoriesService) {}

  @Get()
  findAll() {
    return this.categoriesService.findAllPublic();
  }
}
