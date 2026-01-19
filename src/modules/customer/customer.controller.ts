import { Body, Controller, Delete, Get, Param, Patch, Post, Query } from '@nestjs/common';
import { CustomerService } from './customer.service';
import { CreateCustomerBodyDto } from './dto/create-customer.dto';
import { DeleteManyCustomerBodyDto } from './dto/delete-customer.dto';
import { ListCustomersBodyDto, ListCustomersQueryDto } from './dto/list-customers.dto';
import { UpdateCustomerBodyDto } from './dto/update-customer.dto';

@Controller('/customers')
export class CustomerController {
  constructor(private readonly customerService: CustomerService) {}

  @Post()
  create(@Body() body: CreateCustomerBodyDto) {
    return this.customerService.create(body);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() body: UpdateCustomerBodyDto) {
    return this.customerService.update(id, body);
  }

  @Get(':id/overview')
  getInfo(@Param('id') id: string) {
    return this.customerService.getOverview(id);
  }

  @Get(':id/purchases')
  getPurchases(@Param('id') id: string, @Query('cursor') cursor: string) {
    return this.customerService.getPurchases(id);
  }

  @Get(':id/stats')
  getStats(@Param('id') id: string) {
    return this.customerService.getStats(id);
  }

  @Delete(':id')
  delete(@Param('id') id: string, @Query('deleteSales') canDeleteSales: boolean) {
    return this.customerService.delete(id, canDeleteSales);
  }

  @Delete()
  deleteMany(@Body() body: DeleteManyCustomerBodyDto, @Query('deleteSales') canDeleteSales: boolean) {
    return this.customerService.deleteMany(body, canDeleteSales);
  }

  @Get('/autocomplete')
  listAutocomplete(@Query('search') search: string) {
    return this.customerService.listAutocomplete(search || '');
  }

  @Post('/list')
  listTable(@Query() query: ListCustomersQueryDto, @Body() body: ListCustomersBodyDto) {
    return this.customerService.listTable(
      {
        page: query.page || 1,
        search: query.search || '',
        ...query,
      },
      body,
    );
  }
}
