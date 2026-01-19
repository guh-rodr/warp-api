import { Body, Controller, Delete, Get, Param, Post, Query } from '@nestjs/common';
import { CreateInstallmentBodyDto } from './dto/create-installment.dto';
import { CreateSaleBodyDto } from './dto/create-sale.dto';
import { DeleteManySaleBodyDto } from './dto/delete-sale.dto';
import { ListSalesBodyDto, ListSalesQueryDto } from './dto/list-sales.dto';
import { SaleService } from './sale.service';

@Controller('/sales')
export class SaleController {
  constructor(private readonly saleService: SaleService) {}

  @Post()
  create(@Body() body: CreateSaleBodyDto) {
    return this.saleService.create(body);
  }

  @Post('list')
  list(@Query() query: ListSalesQueryDto, @Body() body: ListSalesBodyDto) {
    const params = { ...query, page: query.page, search: query.search };

    return this.saleService.listTable(params, body);
  }

  @Get('/:id/overview')
  getInfo(@Param('id') id: string) {
    return this.saleService.getOverview(id);
  }

  @Get('/:id/items')
  getItems(@Param('id') id: string) {
    return this.saleService.getItems(id);
  }

  @Delete('/:id')
  delete(@Param('id') id: string) {
    return this.saleService.delete(id);
  }

  @Delete()
  deleteMany(@Body() body: DeleteManySaleBodyDto) {
    return this.saleService.deleteMany(body);
  }

  @Get('/:id/installments')
  getInstallments(@Param('id') id: string) {
    return this.saleService.getInstallments(id);
  }

  @Post('/:id/installments')
  createInstallment(@Param('id') saleId: string, @Body() body: CreateInstallmentBodyDto) {
    return this.saleService.createInstallment(saleId, body);
  }

  @Delete('/:sid/installments/:id')
  deleteInstallment(@Param('id') id: string) {
    return this.saleService.deleteInstallment(id);
  }
}
