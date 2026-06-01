import { Injectable } from '@nestjs/common';
import { DateTime } from 'luxon';
import { buildPrismaFilter } from 'src/common/utils/filter.util';
import { buildPrismaPagination } from 'src/common/utils/pagination.util';
import { buildPrismaSort } from 'src/common/utils/sort.util';
import { PrismaService } from 'src/prisma.service';
import { ListSalesBodyDto } from '../sales/dto/list-sales.dto';
import { CUSTOMER_FILTERS_MAP } from './customer.filters';
import { CUSTOMER_SORTABLE_FIELDS } from './customer.sort';
import { CreateCustomerBodyDto } from './dto/create-customer.dto';
import {
  CreateCustomerResponseDto,
  CustomerAutocompleteResponseDto,
  CustomerListResponseDto,
  CustomerOverviewResponseDto,
  CustomerPreferencesDto,
  CustomerSaleResponseDto,
  CustomerStatsResponseDto,
  UpdateCustomerResponseDto,
} from './dto/customer-response.dto';
import { DeleteManyCustomerBodyDto } from './dto/delete-customer.dto';
import { ListCustomersQueryDto } from './dto/list-customers.dto';
import { UpdateCustomerBodyDto } from './dto/update-customer.dto';

@Injectable()
export class CustomerService {
  constructor(private prisma: PrismaService) {}

  async create(data: CreateCustomerBodyDto): Promise<CreateCustomerResponseDto> {
    const customer = await this.prisma.customer.create({
      data,
      select: {
        id: true,
        name: true,
      },
    });

    return customer;
  }

  async getOverview(id: string): Promise<CustomerOverviewResponseDto> {
    const { sales, ...customer } = await this.prisma.customer.findUniqueOrThrow({
      where: { id },
      select: {
        name: true,
        phone: true,
        sales: {
          orderBy: { purchasedAt: 'desc' },
          take: 1,
        },
      },
    });

    return {
      ...customer,
      lastPurchaseAt: sales[0]?.purchasedAt,
    };
  }

  private async getMetrics(customerId: string) {
    const [salesMetrics, totalInflow] = await this.prisma.$transaction([
      this.prisma.sale.aggregate({
        where: { customerId },
        _sum: { total: true },
        _count: { id: true },
      }),

      this.prisma.cashFlowTransaction.aggregate({
        _sum: { value: true },
        where: {
          flow: 'inflow',
          sale: {
            customerId,
          },
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
    const preferences = await this.prisma.$queryRaw<CustomerPreferencesDto[]>`
      WITH base AS (
        SELECT pv.color, pv.size, si."categoryName"
        FROM "ProductVariant" pv
        JOIN "SaleItem" si ON si."variantId" = pv.id
        JOIN "Sale" s ON s.id = si."saleId"
        WHERE s."customerId" = ${id}
      )

      SELECT
      (
        SELECT color FROM base
        GROUP BY color
        ORDER BY COUNT(*) DESC
        LIMIT 1
      ) AS "topColor",

      (
        SELECT size FROM base
        GROUP BY size
        ORDER BY COUNT(*) DESC
        LIMIT 1
      ) AS "topSize",

      (
        SELECT "categoryName" FROM base
        GROUP BY "categoryName"
        ORDER BY COUNT(*) DESC
        LIMIT 1
      ) AS "topCategory";
    `;

    const { topColor, topCategory, topSize } = preferences[0];

    return {
      topCategory,
      topColor,
      topSize,
    };
  }

  async getStats(id: string): Promise<CustomerStatsResponseDto> {
    await this.prisma.customer.findUniqueOrThrow({ where: { id } });

    const metrics = await this.getMetrics(id);
    const preferences = await this.getPreferences(id);

    return {
      metrics,
      preferences,
    };
  }

  async getSales(customerId: string): Promise<CustomerSaleResponseDto[]> {
    const { sales } = await this.prisma.customer.findUniqueOrThrow({
      where: { id: customerId },
      select: {
        sales: {
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
        },
      },
    });

    const result = sales.map((sale): CustomerSaleResponseDto => {
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

  async update(id: string, data: UpdateCustomerBodyDto): Promise<UpdateCustomerResponseDto> {
    const customer = await this.prisma.customer.update({
      where: { id },
      data,
    });

    return customer;
  }

  async listAutocomplete(search: string): Promise<CustomerAutocompleteResponseDto[]> {
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

  async listTable(options: ListCustomersQueryDto, filter: ListSalesBodyDto): Promise<CustomerListResponseDto> {
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

  async delete(id: string) {
    await this.prisma.$transaction(async (tx) => {
      const hasSales = await tx.sale.findFirst({ where: { customerId: id } });

      if (hasSales) {
        const now = DateTime.now().setZone('America/Sao_Paulo').toJSDate();

        await tx.customer.update({
          where: { id },
          data: {
            deletedAt: now,
          },
        });
      } else {
        await tx.customer.delete({ where: { id } });
      }
    });
  }

  async deleteMany({ ids }: DeleteManyCustomerBodyDto) {
    await this.prisma.$transaction(async (tx) => {
      const customersWithPurchases = await tx.customer.findMany({
        where: {
          id: { in: ids },
        },
        select: {
          id: true,
          _count: { select: { sales: true } },
        },
      });

      const idsWithPurchases = new Set(customersWithPurchases.map((p) => p.id));

      const toSoftDelete = ids.filter((id) => idsWithPurchases.has(id));
      const toHardDelete = ids.filter((id) => !idsWithPurchases.has(id));

      const now = DateTime.now().setZone('America/Sao_Paulo').toJSDate();

      if (toHardDelete.length > 0) {
        await tx.customer.deleteMany({
          where: {
            id: { in: toHardDelete },
          },
        });
      }

      if (toSoftDelete.length > 0) {
        await tx.customer.updateMany({
          where: {
            id: { in: toSoftDelete },
          },
          data: {
            deletedAt: now,
          },
        });
      }
    });
  }
}
