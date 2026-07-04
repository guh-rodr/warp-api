import { BadRequestException, Injectable } from '@nestjs/common';
import { Prisma } from 'generated/prisma/browser';
import { PrismaClient } from 'generated/prisma/client';
import { ReceivableUncheckedCreateInput } from 'generated/prisma/models';
import { DateTime } from 'luxon';
import { buildPrismaFilter } from 'src/common/utils/filter.util';
import { buildPrismaPagination } from 'src/common/utils/pagination.util';
import { buildPrismaSort } from 'src/common/utils/sort.util';
import { PrismaService } from 'src/prisma.service';
import { CreateSaleBodyDto } from './dto/create-sale.dto';
import { DeleteManySaleBodyDto } from './dto/delete-sale.dto';
import { ListSalesBodyDto, ListSalesQueryDto } from './dto/list-sales.dto';
import { SaleListResponseDto, SaleRowDto } from './dto/sale-response.dto';
import { SALE_FILTERS_MAP } from './sale.filters';
import { SALE_SORTABLE_FIELDS } from './sale.sort';

@Injectable()
export class SaleService {
  constructor(private prisma: PrismaService) {}

  private getVariantsFrequency(ids: string[]) {
    const freq = new Map<string, number>();
    for (const id of ids) {
      freq.set(id, (freq.get(id) ?? 0) + 1);
    }
    return freq;
  }

  private async updateVariantStock(
    variantId: string,
    saleId: string,
    quantity: number,
    prismaClient: Prisma.TransactionClient | PrismaClient = this.prisma,
  ) {
    await prismaClient.productVariant.update({
      where: { id: variantId },
      data: {
        quantity: { decrement: quantity },
        stockMovements: {
          create: {
            type: 'EXIT',
            origin: 'SALE',
            quantity,
            saleId: saleId,
          },
        },
      },
    });
  }

  private calcSaleSummary(items: CreateSaleBodyDto['items'], variantsMapping: Map<string, any>) {
    const { totalCostPrice, totalSalePrice } = items.reduce(
      (acc, cv) => {
        const { averageCost, costPrice } = variantsMapping.get(cv.variantId);

        acc.totalCostPrice += averageCost ?? costPrice ?? 0;
        acc.totalSalePrice += cv.salePrice;
        return acc;
      },
      { totalCostPrice: 0, totalSalePrice: 0 },
    );

    const summary = {
      total: totalSalePrice,
      profit: totalSalePrice - totalCostPrice,
    };

    return summary;
  }

  async create(data: CreateSaleBodyDto) {
    const variantsIds = data.items.map((i) => i.variantId);
    const variantsFrequency = this.getVariantsFrequency(variantsIds);

    const sale = await this.prisma.$transaction(async (tx) => {
      const variants = await tx.productVariant.findMany({
        where: { id: { in: variantsIds } },
        select: {
          id: true,
          averageCost: true,
          costPrice: true,
          salePrice: true,
          product: { select: { name: true, category: { select: { name: true } } } },
        },
      });

      const variantsMapping = new Map(variants.map(({ id, ...variant }) => [id, variant]));

      if (variants.length < data.items.length) {
        const unknownItem = data.items.find((i) => !variantsMapping.get(i.variantId));
        throw new BadRequestException(`A variante '${unknownItem.variantId}' não foi encontrada`);
      }

      const summary = this.calcSaleSummary(data.items, variantsMapping);

      const purchasedAt = DateTime.fromISO(data.purchasedAt, { zone: 'America/Sao_Paulo' }).toJSDate();

      const saleItems: Prisma.SaleItemCreateManySaleInput[] = data.items.map((item) => {
        const { averageCost, costPrice, product } = variantsMapping.get(item.variantId);

        return {
          categoryName: product.category.name,
          productName: product.name,
          costPrice: averageCost ?? costPrice ?? 0,
          salePrice: item.salePrice,
          variantId: item.variantId,
        };
      });

      // registra a venda
      const createdSale = await tx.sale.create({
        data: {
          ...summary,
          customerId: data.customerId,
          purchasedAt,
          items: {
            createMany: { data: saleItems },
          },
        },
        include: {
          customer: { select: { name: true } },
          receivables: {
            select: { id: true },
          },
        },
      });

      const receivablesToCreate: ReceivableUncheckedCreateInput[] = [];

      if (data.paymentTerm === 'IMMEDIATE') {
        if (data.payments.length === 0) throw new BadRequestException('Nenhum pagamento definido');

        receivablesToCreate.push({
          status: 'PAID',
          type: 'IMMEDIATE',
          saleId: createdSale.id,
          customerId: data.customerId,
          total: summary.total,
          paid: summary.total,
          allocations: {
            create: data.payments.map((p) => ({
              amount: p.value,
              payment: {
                create: {
                  method: p.method,
                  total: p.value,
                  paidAt: purchasedAt,
                  transaction: {
                    create: {
                      category: 'SALES_REVENUE',
                      flow: 'INFLOW',
                      date: purchasedAt,
                      description: 'Venda realizada',
                      value: p.value,
                    },
                  },
                },
              },
            })),
          },
        });
      }

      if (data.paymentTerm === 'INSTALLMENT') {
        if (data.receivables.length === 0) throw new BadRequestException('Nenhuma parcela definida');

        data.receivables.forEach((r, idx) => {
          const dueDate = DateTime.fromISO(r.dueDate, { zone: 'America/Sao_Paulo' }).toJSDate();

          receivablesToCreate.push({
            customerId: data.customerId,
            saleId: createdSale.id,
            status: 'PENDING',
            type: 'INSTALLMENT',
            installmentCount: data.receivables.length,
            installmentIdx: idx + 1,
            total: r.value,
            dueDate,
          });
        });
      }

      if (data.paymentTerm === 'TAB') {
        receivablesToCreate.push({
          saleId: createdSale.id,
          customerId: data.customerId,
          status: 'PENDING',
          total: summary.total - (data.entry?.value ?? 0),
          type: 'TAB',
        });
      }

      if (data.paymentTerm !== 'IMMEDIATE' && data.entry) {
        receivablesToCreate.push({
          status: 'PAID',
          type: 'IMMEDIATE',
          saleId: createdSale.id,
          customerId: data.customerId,
          total: data.entry.value,
          paid: data.entry.value,
          dueDate: null,
          allocations: {
            create: {
              amount: data.entry.value,
              payment: {
                create: {
                  method: data.entry.method,
                  total: data.entry.value,
                  paidAt: purchasedAt,
                  transactions: {
                    create: {
                      category: 'SALES_REVENUE',
                      origin: 'PAYMENT',
                      date: purchasedAt,
                      description: 'Entrada ',
                      flow: 'INFLOW',
                      value: data.entry.value,
                    },
                  },
                },
              },
            },
          },
        });
      }

      // cria os recebiveis, pagamentos e allocations
      await Promise.all(receivablesToCreate.map((receivable) => tx.receivable.create({ data: receivable })));

      // atualiza o estoque das variantes e cria a mov. estoque
      await Promise.all(
        [...variantsFrequency.entries()].map(([variantId, quantity]) =>
          this.updateVariantStock(variantId, createdSale.id, quantity, tx),
        ),
      );

      return createdSale;
    });

    return sale;
  }

  async getOverview(saleId: string) {
    const sale = await this.prisma.sale.findFirstOrThrow({
      where: { id: saleId },
      select: {
        total: true,
        profit: true,
        purchasedAt: true,
        receivables: {
          where: { status: { not: 'PENDING' } },
          select: { paid: true },
        },
        customer: {
          select: { id: true, name: true },
        },
      },
    });

    const totalReceived = sale.receivables.reduce((acc, curr) => acc + curr.paid, 0);

    const status = totalReceived === sale.total ? 'PAID' : 'PENDING';

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
    const sale = await this.prisma.sale.findFirstOrThrow({
      where: {
        id: saleId,
      },
      select: {
        items: {
          select: {
            id: true,
            variantId: true,
            categoryName: true,
            productName: true,
            costPrice: true,
            salePrice: true,
            variant: {
              select: {
                color: true,
                size: true,
              },
            },
          },
        },
      },
    });

    const groupedItems = Object.values(
      sale.items.reduce(
        (acc, item) => {
          const key = item.variantId;
          if (!acc[key]) {
            acc[key] = { ...item, quantity: 0 };
          }
          acc[key].quantity += 1;
          return acc;
        },
        {} as Record<string, (typeof sale.items)[0] & { quantity: number }>,
      ),
    );

    return groupedItems;
  }

  async delete(id: string) {
    await this.prisma.sale.delete({ where: { id } });
  }

  async deleteMany(data: DeleteManySaleBodyDto) {
    await this.prisma.sale.deleteMany({ where: { id: { in: data.ids } } });
  }

  async listTable(options: ListSalesQueryDto, filter: ListSalesBodyDto): Promise<SaleListResponseDto> {
    const sort = buildPrismaSort(options, SALE_SORTABLE_FIELDS);
    const pagination = buildPrismaPagination(options);

    const queries = buildPrismaFilter(filter, SALE_FILTERS_MAP);

    const count = await this.prisma.saleStats.count({
      where: queries,
    });

    const rows = await this.prisma.saleStats.findMany({
      where: queries,
      orderBy: sort || { id: 'desc' },
      ...pagination,
    });

    const rowsWithCustomer = rows.map(({ customerId, customerName, ...row }) => ({
      ...row,
      customer: customerId ? { id: customerId, name: customerName } : null,
      itemCount: Number(row.itemCount),
    })) as SaleRowDto[];

    const result = {
      rowCount: count,
      pageCount: Math.ceil(count / 10),
      rows: rowsWithCustomer,
    };

    return result;
  }
}
