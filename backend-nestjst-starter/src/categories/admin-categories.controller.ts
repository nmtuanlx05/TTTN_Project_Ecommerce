import {
  Body,
  Controller,
  Delete,
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
import { CategoriesService } from './categories.service';
import { CreateCategoryDto } from './dto/create-category.dto';
import { QueryCategoriesDto } from './dto/query-categories.dto';
import { UpdateCategoryDto } from './dto/update-category.dto';

// JwtAuthGuard đã bật toàn cục nên chỉ cần RolesGuard. Mặc định ADMIN + STAFF;
// endpoint chỉ dành cho ADMIN ghi đè @Roles ở cấp method.
@Controller('admin/categories')
@UseGuards(RolesGuard)
@Roles('ADMIN', 'STAFF')
export class AdminCategoriesController {
  constructor(private readonly categoriesService: CategoriesService) {}

  @Get()
  findAll(@Query() query: QueryCategoriesDto) {
    return this.categoriesService.findAll(query);
  }

  @Get(':id')
  findOne(@Param('id', parseIdPipe) id: number) {
    return this.categoriesService.findOne(id);
  }

  @Post()
  @Roles('ADMIN')
  create(@Body() createCategoryDto: CreateCategoryDto) {
    return this.categoriesService.create(createCategoryDto);
  }

  @Patch(':id')
  update(
    @Param('id', parseIdPipe) id: number,
    @Body() updateCategoryDto: UpdateCategoryDto,
  ) {
    return this.categoriesService.update(id, updateCategoryDto);
  }

  @Delete(':id')
  @Roles('ADMIN')
  remove(@Param('id', parseIdPipe) id: number) {
    return this.categoriesService.remove(id);
  }
}
