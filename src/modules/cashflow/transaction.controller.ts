import { Body, Controller, Delete, Param, Patch, Post, Query } from '@nestjs/common';
import { CreateTransactionBodyDto } from './dto/create-transaction.dto';
import { DeleteManyTransactionBodyDto } from './dto/delete-transaction.dto';
import { ListTransactionsBodyDto, ListTransactionsQueryDto } from './dto/list-transactions.dto';
import { UpdateTransactionBodyDto } from './dto/update-transaction.dto';
import { TransactionService } from './transaction.service';

@Controller('/cashflow-transactions')
export class TransactionController {
  constructor(private readonly transactionService: TransactionService) {}

  @Post('')
  create(@Body() body: CreateTransactionBodyDto) {
    return this.transactionService.create(body);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() body: UpdateTransactionBodyDto) {
    return this.transactionService.update(id, body);
  }

  @Delete(':id')
  delete(@Param('id') id: string) {
    return this.transactionService.delete(id);
  }

  @Delete()
  deleteMany(@Body() body: DeleteManyTransactionBodyDto) {
    return this.transactionService.deleteMany(body);
  }

  @Post('/list')
  listTable(@Query() query: ListTransactionsQueryDto, @Body() body: ListTransactionsBodyDto) {
    const params = { ...query, page: query.page, search: query.search };

    return this.transactionService.listTable(params, body);
  }
}
