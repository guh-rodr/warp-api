import { HttpException, HttpStatus, Injectable } from '@nestjs/common';
import { Prisma } from 'generated/prisma/client';
import { DateTime } from 'luxon';
import { buildPrismaFilter } from 'src/common/utils/filter.util';
import { buildPrismaPagination } from 'src/common/utils/pagination.util';
import { buildPrismaSort } from 'src/common/utils/sort.util';
import { PrismaService } from 'src/prisma.service';
import { CreateInstallmentBodyDto } from './dto/create-installment.dto';
import { CreateSaleBodyDto } from './dto/create-sale.dto';
import { DeleteManySaleBodyDto } from './dto/delete-sale.dto';
import { ListSalesBodyDto, ListSalesQueryDto } from './dto/list-sales.dto';
import { SALE_FILTERS_MAP } from './sale.filters';
import { SALE_SORTABLE_FIELDS } from './sale.sort';

async function delay(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

@Injectable()
export class SaleService {
  constructor(private prisma: PrismaService) {}

  async create(data: CreateSaleBodyDto) {
    const purchasedAt = DateTime.fromISO(data.purchasedAt, { zone: 'America/Sao_Paulo' }).toJSDate();
    const installmentPaidAt = DateTime.fromISO(data.installment?.paidAt, { zone: 'America/Sao_Paulo' }).toJSDate();
    const saleType = !!data.installment ? 'Parcela 1' : 'À vista';

    const summary = {
      total: data.items.reduce((acc, cv) => acc + cv.salePrice, 0),
      profit: data.items.reduce((acc, cv) => acc + (cv.salePrice - cv.costPrice), 0),
    };

    let transactionDesc = '';

    if (data.customerId) {
      const customer = await this.prisma.customer.findFirst({
        where: { id: data.customerId },
      });

      const firstName = customer.name.split(' ')[0];

      transactionDesc = `Compra de ${firstName} - ${saleType}`;
    } else {
      transactionDesc = `Compra [sem cliente] - ${saleType}`;
    }

    const date = !!data.installment ? installmentPaidAt : purchasedAt;
    const transactionValue = !!data.installment ? data.installment.value : summary.total;

    const modelIds = data.items.map((i) => i.modelId);
    const models = await this.prisma.model.findMany({
      where: {
        id: { in: modelIds },
      },
      select: {
        id: true,
        name: true,
        category: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });

    const items: Prisma.SaleItemCreateManySaleInput[] = data.items.map((item) => {
      const model = models.find((m) => m.id === item.modelId);

      if (!model) {
        throw new HttpException(`Modelo ID ${item.modelId} não encontrado`, HttpStatus.BAD_REQUEST);
      }

      return {
        ...item,
        categoryName: model.category.name,
        modelName: model.name,
      };
    });

    await this.prisma.sale.create({
      data: {
        ...summary,
        customerId: data.customerId,
        isInstallment: !!data.installment,
        purchasedAt: purchasedAt,
        items: { createMany: { data: items } },
        transactions: {
          create: {
            flow: 'inflow',
            date: date,
            description: transactionDesc,
            category: 'SALES_REVENUE',
            value: transactionValue,
          },
        },
      },
    });
  }

  async getOverview(saleId: string) {
    await delay(1000);

    const sale = await this.prisma.sale.findFirst({
      where: { id: saleId },
      select: {
        total: true,
        profit: true,
        purchasedAt: true,
        transactions: {
          select: { value: true },
        },
        customer: {
          select: { id: true, name: true },
        },
      },
    });

    const totalReceived = sale.transactions.reduce((acc, curr) => acc + curr.value, 0);

    const status = totalReceived === sale.total ? 'paid' : 'pending';

    const profitMargin = sale.total === 0 ? 0 : sale.profit / sale.total;
    const profitReceived = totalReceived * profitMargin;

    return {
      status,
      customer: sale.customer,
      purchasedAt: sale.purchasedAt,
      total: sale.total,
      totalReceived: totalReceived,
      profit: sale.profit,
      profitReceived: profitReceived,
    };
  }

  async getItems(saleId: string) {
    await delay(2000);

    const items = await this.prisma.saleItem.findMany({
      where: { saleId },
      select: {
        id: true,
        categoryName: true,
        modelName: true,
        size: true,
        color: true,
        print: true,
        costPrice: true,
        salePrice: true,
      },
    });

    const result = items.map((i) => ({
      ...i,
      costPrice: i.costPrice,
      salePrice: i.salePrice,
    }));

    return result;
  }

  async delete(id: string) {
    const sale = await this.prisma.sale.delete({ where: { id } });
    return sale;
  }

  async deleteMany(data: DeleteManySaleBodyDto) {
    const sales = await this.prisma.sale.deleteMany({ where: { id: { in: data.ids } } });
    return sales;
  }

  async getInstallments(saleId: string) {
    await delay(2000);

    const installments = await this.prisma.cashFlowTransaction.findMany({
      where: { saleId, flow: 'inflow', category: 'SALES_REVENUE' },
      select: {
        id: true,
        date: true,
        value: true,
      },
      orderBy: {
        date: 'desc',
      },
    });

    const result = installments.map(({ date, ...i }) => ({
      ...i,
      paidAt: date,
      value: i.value,
    }));

    return result;
  }

  async createInstallment(saleId: string, data: CreateInstallmentBodyDto) {
    await delay(2000);

    const paidAt = DateTime.fromISO(data.paidAt, { zone: 'America/Sao_Paulo' }).toJSDate();

    const sale = await this.prisma.sale.findFirst({
      where: { id: saleId },
      select: {
        customer: { select: { name: true } },
        _count: { select: { transactions: true } },
      },
    });

    if (!sale) {
      throw new HttpException('Erro ao processar a requisição', HttpStatus.INTERNAL_SERVER_ERROR);
    }

    const newInstallmentCount = sale._count.transactions + 1;

    const updatedSale = await this.prisma.sale.update({
      where: { id: saleId },
      data: {
        transactions: {
          create: {
            date: paidAt,
            description: `Compra de ${sale.customer.name} - Parcela ${newInstallmentCount}`,
            value: data.value,
            flow: 'inflow',
            category: 'installment',
          },
        },
      },
      select: {
        transactions: {
          select: {
            id: true,
            value: true,
            date: true,
          },
        },
      },
    });

    const createdInstallment = updatedSale.transactions[updatedSale.transactions.length - 1];

    return {
      id: createdInstallment.id,
      value: createdInstallment.value,
      date: createdInstallment.date,
    };
  }

  async deleteInstallment(id: string) {
    await this.prisma.cashFlowTransaction.delete({
      where: {
        id,
        flow: 'inflow',
        category: 'installment',
      },
    });
  }

  async listTable(options: ListSalesQueryDto, filter: ListSalesBodyDto) {
    const sort = buildPrismaSort(options, SALE_SORTABLE_FIELDS);
    const pagination = buildPrismaPagination(options);

    const queries = buildPrismaFilter(filter, SALE_FILTERS_MAP);

    const count = await this.prisma.saleStats.count({
      where: queries,
    });

    const rows = await this.prisma.saleStats.findMany({
      where: queries,
      orderBy: sort || { createdAt: 'desc' },
      ...pagination,
    });

    const mappedRows = rows.map(({ customerId, customerName, ...row }) => ({
      customer: customerId ? { id: customerId, name: customerName } : null,
      ...row,
    }));

    const result = {
      rowCount: count,
      pageCount: Math.ceil(count / 10),
      rows: mappedRows,
    };

    return result;
  }
}
