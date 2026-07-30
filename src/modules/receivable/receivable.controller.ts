import { Body, Controller, Delete, Get, Param, Patch, Post, Query } from '@nestjs/common';
import { Public } from 'src/common/decorators/public.decorator';
import { CreatePaymentsBodyDto } from './dto/create-payments.dto';
import { CreateReceivableBodyDto, ReverseReceivableBodyDto } from './dto/create-receivable.dto';
import { ListReceivablesBodyDto, ListReceivablesQueryDto } from './dto/list-receivable.dto';
import { UpdateReceivableBodyDto } from './dto/update-receivable.dto';
import { ReceivableService } from './receivable.service';

@Controller('/receivables')
export class ReceivableController {
  constructor(private readonly receivableService: ReceivableService) {}

  @Post()
  @Public()
  async create(@Body() body: CreateReceivableBodyDto) {
    return this.receivableService.createReceivable(body);
  }

  @Patch(':id')
  async update(@Param('id') receivableId: string, @Body() body: UpdateReceivableBodyDto) {
    return this.receivableService.updateReceivable(receivableId, body);
  }

  @Post('/list')
  @Public()
  async listTable(@Query() query: ListReceivablesQueryDto, @Body() body: ListReceivablesBodyDto) {
    return this.receivableService.listTable(query, body);
  }

  @Get()
  @Public()
  async findByCustomer(@Query('customerId') customerId: string) {
    return this.receivableService.findByCustomer(customerId);
  }

  @Get(':id/payments')
  @Public()
  async findAllocations(@Param('id') receivableId: string) {
    return this.receivableService.findAllocations(receivableId);
  }

  @Post(':id/reverse')
  @Public()
  async reverseAllocations(@Param('id') receivableId: string, @Body() body: ReverseReceivableBodyDto) {
    return this.receivableService.reverseAllocations(receivableId, body);
  }

  @Post('/payments')
  @Public()
  async createPayments(@Body() body: CreatePaymentsBodyDto) {
    return this.receivableService.createPayments(body);
  }

  @Post(':id/cancel')
  @Public()
  async cancelReceivable(@Param('id') receivableId: string) {
    return this.receivableService.cancelReceivable(receivableId);
  }

  @Post(':id/uncancel')
  @Public()
  async uncancelReceivable(@Param('id') receivableId: string) {
    return this.receivableService.uncancelReceivable(receivableId);
  }

  @Delete(':id')
  async deleteReceivable(@Param('id') receivableId: string) {
    return this.receivableService.deleteReceivable(receivableId);
  }
}
