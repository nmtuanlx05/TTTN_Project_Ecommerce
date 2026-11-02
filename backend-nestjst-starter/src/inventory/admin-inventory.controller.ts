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
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { Roles } from '../auth/decorators/roles.decorator';
import { RolesGuard } from '../auth/guards/roles.guard';
import type { AuthUser } from '../auth/auth.types';
import { parseIdPipe } from '../common/pipes/parse-id.pipe';
import { AdjustStockDto } from './dto/adjust-stock.dto';
import { ExportStockDto } from './dto/export-stock.dto';
import { ImportStockDto } from './dto/import-stock.dto';
import { QueryInventorySummaryDto } from './dto/query-inventory-summary.dto';
import { QueryInventoryDto } from './dto/query-inventory.dto';
import { QueryMovementsDto } from './dto/query-movements.dto';
import { UpdateMinStockDto } from './dto/update-min-stock.dto';
import { InventoryService } from './inventory.service';

// JwtAuthGuard đã bật toàn cục nên chỉ cần RolesGuard. Route cố định (summary) đặt trước route có :variantId.
@Controller('admin/inventory')
@UseGuards(RolesGuard)
@Roles('ADMIN', 'STAFF')
export class AdminInventoryController {
  constructor(private readonly inventoryService: InventoryService) {}

  @Get()
  findAll(@Query() query: QueryInventoryDto) {
    return this.inventoryService.findAll(query);
  }

  @Get('summary')
  getSummary(@Query() query: QueryInventorySummaryDto) {
    return this.inventoryService.getSummary(query);
  }

  @Post(':variantId/import')
  importStock(
    @Param('variantId', parseIdPipe) variantId: number,
    @Body() dto: ImportStockDto,
    @CurrentUser() user: AuthUser,
  ) {
    return this.inventoryService.importStock(variantId, dto, user.id);
  }

  @Post(':variantId/export')
  exportStock(
    @Param('variantId', parseIdPipe) variantId: number,
    @Body() dto: ExportStockDto,
    @CurrentUser() user: AuthUser,
  ) {
    return this.inventoryService.exportStock(variantId, dto, user.id);
  }

  @Post(':variantId/adjust')
  adjustStock(
    @Param('variantId', parseIdPipe) variantId: number,
    @Body() dto: AdjustStockDto,
    @CurrentUser() user: AuthUser,
  ) {
    return this.inventoryService.adjustStock(variantId, dto, user.id);
  }

  @Patch(':variantId/min-stock')
  updateMinStock(
    @Param('variantId', parseIdPipe) variantId: number,
    @Body() { minStock }: UpdateMinStockDto,
  ) {
    return this.inventoryService.updateMinStock(variantId, minStock);
  }

  @Get(':variantId/movements')
  findMovements(
    @Param('variantId', parseIdPipe) variantId: number,
    @Query() query: QueryMovementsDto,
  ) {
    return this.inventoryService.findMovements(variantId, query);
  }
}
