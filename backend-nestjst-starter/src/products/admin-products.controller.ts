import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { Roles } from '../auth/decorators/roles.decorator';
import { RolesGuard } from '../auth/guards/roles.guard';
import { parseIdPipe } from '../common/pipes/parse-id.pipe';
import { CreateProductDto } from './dto/create-product.dto';
import { QueryProductsDto } from './dto/query-products.dto';
import { UpdateProductStatusDto } from './dto/update-product-status.dto';
import { UpdateProductDto } from './dto/update-product.dto';
import { ProductsService } from './products.service';

// JwtAuthGuard đã bật toàn cục nên chỉ cần RolesGuard. Không có DELETE: "xóa" = ẩn qua PATCH :id/status.
@Controller('admin/products')
@UseGuards(RolesGuard)
@Roles('ADMIN', 'STAFF')
export class AdminProductsController {
  constructor(private readonly productsService: ProductsService) {}

  @Get()
  findAll(@Query() query: QueryProductsDto) {
    return this.productsService.findAll(query);
  }

  @Get(':id')
  findOne(@Param('id', parseIdPipe) id: number) {
    return this.productsService.findOne(id);
  }

  @Post()
  create(@Body() createProductDto: CreateProductDto) {
    return this.productsService.create(createProductDto);
  }

  @Patch(':id')
  update(
    @Param('id', parseIdPipe) id: number,
    @Body() updateProductDto: UpdateProductDto,
  ) {
    return this.productsService.update(id, updateProductDto);
  }

  @Patch(':id/status')
  updateStatus(
    @Param('id', parseIdPipe) id: number,
    @Body() { isActive }: UpdateProductStatusDto,
  ) {
    return this.productsService.updateStatus(id, isActive);
  }
}
