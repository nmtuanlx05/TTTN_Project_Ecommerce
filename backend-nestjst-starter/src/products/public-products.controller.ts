import { Controller, Get, Param, Query } from '@nestjs/common';
import { Public } from '../auth/decorators/public.decorator';
import { QueryPublicProductsDto } from './dto/query-public-products.dto';
import { ProductsService } from './products.service';

// API công khai cho storefront, không cần đăng nhập; chỉ trả sản phẩm đang bán
@Public()
@Controller('products')
export class PublicProductsController {
  constructor(private readonly productsService: ProductsService) {}

  @Get()
  findAll(@Query() query: QueryPublicProductsDto) {
    return this.productsService.findAllPublic(query);
  }

  @Get(':slug')
  findOne(@Param('slug') slug: string) {
    return this.productsService.findBySlug(slug);
  }
}
