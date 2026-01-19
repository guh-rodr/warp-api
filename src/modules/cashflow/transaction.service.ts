import { Injectable } from '@nestjs/common';
import { DateTime } from 'luxon';
import { buildPrismaFilter } from 'src/common/utils/filter.util';
import { buildPrismaPagination } from 'src/common/utils/pagination.util';
import { buildPrismaSort } from 'src/common/utils/sort.util';
import { PrismaService } from 'src/prisma.service';
import { CreateTransactionBodyDto } from './dto/create-transaction.dto';
import { DeleteManyTransactionBodyDto } from './dto/delete-transaction.dto';
import { ListTransactionsBodyDto, ListTransactionsQueryDto } from './dto/list-transactions.dto';
import { UpdateTransactionBodyDto } from './dto/update-transaction.dto';
import { CASHFLOW_FILTERS_MAP } from './transaction.filters';
import { CASHFLOW_SORTABLE_FIELDS } from './transaction.sort';

async function delay(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

@Injectable()
export class TransactionService {
  constructor(private prisma: PrismaService) {}

  async create(data: CreateTransactionBodyDto) {
    const purchasedAt = DateTime.fromISO(data.date, { zone: 'America/Sao_Paulo' }).toJSDate();

    const operation = await this.prisma.cashFlowTransaction.create({
      data: {
        ...data,
        date: purchasedAt,
      },
    });

    return {
      created: operation,
    };
  }

  async update(id: string, data: UpdateTransactionBodyDto) {
    const purchasedAt = DateTime.fromISO(data.date, { zone: 'America/Sao_Paulo' }).toJSDate();

    const operation = await this.prisma.cashFlowTransaction.update({
      where: { id },
      data: {
        ...data,
        date: purchasedAt,
      },
    });

    return {
      ...operation,
      value: operation.value,
    };
  }

  async listTable(options: ListTransactionsQueryDto, filter: ListTransactionsBodyDto) {
    const sort = buildPrismaSort(options, CASHFLOW_SORTABLE_FIELDS);
    const pagination = buildPrismaPagination(options);

    const queries = buildPrismaFilter(filter, CASHFLOW_FILTERS_MAP);

    const count = await this.prisma.cashFlowStats.count({
      where: {
        ...queries,
        description: { startsWith: options.search },
      },
    });

    const rows = await this.prisma.cashFlowStats.findMany({
      where: {
        ...queries,
        description: { startsWith: options.search },
      },
      orderBy: sort || { createdAt: 'desc' },
      ...pagination,
    });

    const transactions = rows.map((r) => ({
      ...r,
      value: r.value,
    }));

    const result = {
      rowCount: count,
      pageCount: Math.ceil(count / 10),
      rows: transactions,
    };

    return result;
  }

  async delete(id: string) {
    const transaction = await this.prisma.cashFlowTransaction.delete({
      where: { id },
    });

    if (transaction.saleId) {
      await this.prisma.sale.delete({
        where: { id: transaction.saleId },
      });
    }
  }

  async deleteMany(data: DeleteManyTransactionBodyDto) {
    const transactions = await this.prisma.cashFlowTransaction.deleteMany({ where: { id: { in: data.ids } } });

    return transactions;
  }
}
