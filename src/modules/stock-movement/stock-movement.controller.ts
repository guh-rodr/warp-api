import { Body, Controller, Get, Post, Query } from '@nestjs/common';
import { CreateStockMovementBodyDto } from './dto/create-stock-movement.dto';
import { ListStockMovementsBodyDto, ListStockMovementsQueryDto } from './dto/list-stock-movements.dto';
import { StockMovementService } from './stock-movement.service';

@Controller('/stock-movements')
export class StockMovementController {
  constructor(private readonly stockMovementService: StockMovementService) {}

  @Post()
  async create(@Body() body: CreateStockMovementBodyDto) {
    return this.stockMovementService.create(body);
  }

  @Get()
  async list(
    @Query('productId') productId: string,
    @Query('variantId') variantId: string,
    @Query('type') type: string,
  ) {
    return this.stockMovementService.list(productId, variantId, type);
  }

  @Post('list')
  async listTable(@Query() query: ListStockMovementsQueryDto, @Body() body: ListStockMovementsBodyDto) {
    return this.stockMovementService.listTable(
      {
        page: query.page || 1,
        ...query,
      },
      body,
    );
  }
}
