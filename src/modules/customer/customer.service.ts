import { Injectable } from '@nestjs/common';
import { buildPrismaFilter } from 'src/common/utils/filter.util';
import { buildPrismaPagination } from 'src/common/utils/pagination.util';
import { buildPrismaSort } from 'src/common/utils/sort.util';
import { PrismaService } from 'src/prisma.service';
import { ListSalesBodyDto } from '../sales/dto/list-sales.dto';
import { CUSTOMER_FILTERS_MAP } from './customer.filters';
import { CUSTOMER_SORTABLE_FIELDS } from './customer.sort';
import { CreateCustomerBodyDto } from './dto/create-customer.dto';
import { DeleteManyCustomerBodyDto } from './dto/delete-customer.dto';
import { ListCustomersQueryDto } from './dto/list-customers.dto';
import { UpdateCustomerBodyDto } from './dto/update-customer.dto';

async function delay(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

@Injectable()
export class CustomerService {
  constructor(private prisma: PrismaService) {}

  async create(data: CreateCustomerBodyDto) {
    const customer = await this.prisma.customer.create({
      data,
      select: {
        id: true,
        name: true,
      },
    });

    return customer;
  }

  async getOverview(id: string) {
    await delay(2000);

    const { purchases, ...customer } = await this.prisma.customer.findFirst({
      where: { id },
      select: {
        name: true,
        phone: true,
        purchases: {
          orderBy: { purchasedAt: 'desc' },
          take: 1,
        },
      },
    });

    return {
      ...customer,
      lastPurchaseAt: purchases[0]?.purchasedAt,
    };
  }

  private async getMetrics() {
    const [salesMetrics, totalInflow] = await this.prisma.$transaction([
      this.prisma.sale.aggregate({
        _sum: { total: true },
        _count: { id: true },
      }),

      this.prisma.cashFlowTransaction.aggregate({
        _sum: { value: true },
        where: {
          flow: 'inflow',
        },
      }),
    ]);

    const totalSold = salesMetrics._sum.total || 0;
    const saleCount = salesMetrics._count.id || 0;
    const totalPaid = totalInflow._sum.value || 0;

    return {
      totalPaid,
      avgTicket: saleCount > 0 ? totalSold / saleCount : 0,
      debt: totalSold - totalPaid,
    };
  }

  private async getPreferences(id: string) {
    const [topCategoryRaw, topColorRaw, topSizeRaw] = await Promise.all([
      this.prisma.$queryRaw`
        SELECT
          c.name as category,
          COUNT(si.id) as count
        FROM SaleItem si
        JOIN Model m ON si.modelId = m.id
        JOIN Category c ON m.categoryId = c.id
        JOIN Sale s ON si.saleId = s.id
        WHERE s.customerId = ${id}
        GROUP BY c.name
        ORDER BY count DESC
        LIMIT 1;
      `,

      this.prisma.saleItem.groupBy({
        by: ['color'],
        where: { sale: { customerId: id } },
        _count: { color: true },
        orderBy: { _count: { color: 'desc' } },
        take: 1,
      }),

      this.prisma.saleItem.groupBy({
        by: ['size'],
        where: { sale: { customerId: id } },
        _count: { size: true },
        orderBy: { _count: { size: 'desc' } },
        take: 1,
      }),
    ]);

    const topCategory = topCategoryRaw[0]?.category;
    const topColor = topColorRaw[0]?.color;
    const topSize = topSizeRaw[0]?.size;

    return {
      topCategory,
      topColor,
      topSize,
    };
  }

  async getStats(id: string) {
    const metrics = await this.getMetrics();
    const preferences = await this.getPreferences(id);

    return {
      metrics,
      preferences,
    };
  }

  async getPurchases(customerId: string) {
    const sales = await this.prisma.sale.findMany({
      where: { customerId },
      select: {
        id: true,
        total: true,
        profit: true,
        purchasedAt: true,
        transactions: {
          select: { value: true },
        },
        _count: { select: { items: true, transactions: true } },
      },
    });

    const result = sales.map((sale) => {
      const totalReceived = sale.transactions.reduce((acc, curr) => acc + curr.value, 0);

      const profitMargin = sale.total === 0 ? 0 : sale.profit / sale.total;
      const profitReceived = totalReceived * profitMargin;

      const isPaid = totalReceived === sale.total;

      return {
        id: sale.id,
        itemCount: sale._count.items,
        installmentCount: sale._count.transactions,
        status: isPaid ? 'paid' : 'pending',
        purchasedAt: sale.purchasedAt,

        total: sale.total,
        totalReceived: totalReceived,
        profit: sale.profit,
        profitReceived: profitReceived,
      };
    });

    return result;
  }

  async update(id: string, data: UpdateCustomerBodyDto) {
    await delay(2000);

    const customer = await this.prisma.customer.update({
      where: { id },
      data,
    });

    return customer;
  }

  async listAutocomplete(search: string) {
    const customers = await this.prisma.customer.findMany({
      where: {
        OR: [{ name: { contains: search } }, { phone: { contains: search } }],
      },
      select: {
        id: true,
        name: true,
      },
      take: 5,
      orderBy: { createdAt: 'desc' },
    });

    return customers;
  }

  async listTable(options: ListCustomersQueryDto, filter: ListSalesBodyDto) {
    const sort = buildPrismaSort(options, CUSTOMER_SORTABLE_FIELDS);
    const pagination = buildPrismaPagination(options);

    const queries = buildPrismaFilter(filter, CUSTOMER_FILTERS_MAP);

    const count = await this.prisma.customerStats.count({
      where: {
        ...queries,
        OR: [{ name: { startsWith: options.search } }, { phone: { startsWith: options.search } }],
      },
    });

    const rows = await this.prisma.customerStats.findMany({
      where: {
        ...queries,
        OR: [{ name: { startsWith: options.search } }, { phone: { startsWith: options.search } }],
      },
      orderBy: sort || { createdAt: 'desc' },
      ...pagination,
    });

    const result = {
      rowCount: count,
      pageCount: Math.ceil(count / 10),
      rows,
    };

    return result;
  }

  async delete(id: string, canDeleteSales: boolean) {
    if (canDeleteSales) {
      await this.prisma.$transaction([
        this.prisma.sale.deleteMany({ where: { customerId: id } }),
        this.prisma.customer.delete({ where: { id } }),
      ]);
    } else {
      await this.prisma.customer.delete({ where: { id } });
    }

    return {
      id,
    };
  }

  async deleteMany(data: DeleteManyCustomerBodyDto, canDeleteSales: boolean) {
    if (canDeleteSales) {
      await this.prisma.$transaction([
        this.prisma.sale.deleteMany({ where: { customerId: { in: data.ids } } }),
        this.prisma.customer.deleteMany({ where: { id: { in: data.ids } } }),
      ]);
    } else {
      await this.prisma.customer.deleteMany({ where: { id: { in: data.ids } } });
    }
  }
}
