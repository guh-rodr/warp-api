import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { ProductVariant } from 'generated/prisma/client';
import { DateTime } from 'luxon';
import { buildPrismaFilter } from 'src/common/utils/filter.util';
import { buildPrismaPagination } from 'src/common/utils/pagination.util';
import { buildPrismaSort } from 'src/common/utils/sort.util';
import { PrismaService } from 'src/prisma.service';
import { CreateStockMovementBodyDto } from './dto/create-stock-movement.dto';
import { ListStockMovementsBodyDto, ListStockMovementsQueryDto } from './dto/list-stock-movements.dto';
import { STOCKMOVEMENT_FILTERS_MAP } from './stock-movement.filters';
import { STOCKMOVEMENT_SORTABLE_FIELDS } from './stock-movement.sort';

@Injectable()
export class StockMovementService {
  constructor(private readonly prisma: PrismaService) {}

  private calcCMP(variant: ProductVariant, data: CreateStockMovementBodyDto) {
    const cost = variant.averageCost ?? variant.costPrice ?? 0;
    const newQuantity = variant.quantity + data.quantity;

    const cmp = (variant.quantity * cost + data.quantity * data.unitCost) / newQuantity;

    return cmp;
  }

  async create(data: CreateStockMovementBodyDto) {
    const date = DateTime.fromISO(data.date, { zone: 'America/Sao_Paulo' }).toJSDate();

    await this.prisma.$transaction(async (tx) => {
      const variant = await tx.productVariant.findFirst({ where: { id: data.variantId } });
      if (!variant) throw new NotFoundException('A variante fornecida não foi encontrada');

      if (data.type === 'ENTRY') {
        const newQuantity = variant.quantity + data.quantity;
        const averageCost = data.unitCost ? this.calcCMP(variant, data) : undefined;

        await tx.productVariant.update({
          where: { id: data.variantId },
          data: {
            averageCost,
            quantity: newQuantity,
          },
        });
      }

      if (data.type === 'EXIT') {
        if (data.quantity > variant.quantity) {
          throw new BadRequestException('Estoque insuficiente');
        }

        const newQuantity = variant.quantity - data.quantity;

        await tx.productVariant.update({
          where: { id: data.variantId },
          data: { quantity: newQuantity },
        });
      }

      await tx.stockMovement.create({ data: { ...data, date, origin: 'MANUAL' } });
    });
  }

  //   const rows = await this.prisma.$queryRaw`
  //   SELECT m.id, m.name, jsonb_build_object('id', c.id, 'name', c.name) as category, m."isVariable", COUNT(mv.id)::INT as "variantCount", SUM(mv.quantity)::INT as "quantity", MIN(mv."salePrice") as "minSalePrice", MAX(mv."salePrice") as "maxSalePrice"
  //   FROM "Product" m
  //   LEFT JOIN "Category" c ON c.id = m."categoryId"
  //   LEFT JOIN "ProductVariant" mv ON mv."productId" = m.id
  //   WHERE m.name ILIKE ${search}
  //   GROUP BY m.id, m.name, c.id, c.name
  //   LIMIT ${pagination.take} OFFSET ${pagination.skip}
  // `;

  // const result = {
  //   rowCount: count,
  //   pageCount: Math.ceil(count / 10),
  //   rows,
  // };

  // return result;

  async list(productId: string, variantId: string, type: string) {
    const LIMIT = 2;

    const stockMovements = await this.prisma.stockMovement.findMany({
      where: {
        variant: { id: variantId || undefined, productId },
        type: (type as any) || undefined,
      },
      select: {
        id: true,
        type: true,
        reason: true,
        date: true,
        quantity: true,
        unitCost: true,
        origin: true,
        // saleId: true,
        variant: {
          select: { color: true, size: true },
        },
      },
      orderBy: { createdAt: 'desc' },
      take: LIMIT + 1,
    });

    return {
      haveMany: stockMovements.length > LIMIT,
      items: stockMovements.slice(0, LIMIT),
    };
  }

  async listTable(options: ListStockMovementsQueryDto, filter: ListStockMovementsBodyDto) {
    const sort = buildPrismaSort(options, STOCKMOVEMENT_SORTABLE_FIELDS);
    const pagination = buildPrismaPagination(options);

    const queries = buildPrismaFilter(filter, STOCKMOVEMENT_FILTERS_MAP);

    const count = await this.prisma.stockMovementStats.count({
      where: {
        reason: { startsWith: options.search, mode: 'insensitive' },
        ...queries,
      },
    });
    const rows = await this.prisma.stockMovementStats.findMany({
      where: {
        reason: { startsWith: options.search, mode: 'insensitive' },
        ...queries,
      },
      orderBy: sort || { id: 'desc' },
      ...pagination,
    });

    const rowsToDto = rows.map((r) => ({
      id: r.id,
      type: r.type,
      unitCost: r.unitCost,
      quantity: r.quantity,
      origin: r.origin,
      date: r.date,
      balance: r.balance,
      reason: r.reason,
      product: { id: r.productId, name: r.productName },
      variant: { id: r.variantId, color: r.variantColor, size: r.variantSize },
    }));

    const result = {
      rowCount: count,
      pageCount: Math.ceil(count / 10),
      rows: rowsToDto,
    };

    return result;
  }
}
