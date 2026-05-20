import { Injectable } from '@nestjs/common';
import { Prisma } from 'generated/prisma/browser';
import { PrismaClient } from 'generated/prisma/client';
import { DateTime } from 'luxon';
import { buildPrismaFilter } from 'src/common/utils/filter.util';
import { buildPrismaPagination } from 'src/common/utils/pagination.util';
import { buildPrismaSort } from 'src/common/utils/sort.util';
import { PrismaService } from 'src/prisma.service';
import * as util from 'util';
import { CreateProductBodyDto, CreateProductVariantDto } from './dto/create-product.dto';
import { BulkDeleteProductsBodyDto } from './dto/delete-product.dto';
import { ListProductsBodyDto, ListProductsQueryDto } from './dto/list-products.dto';
import { UpdateProductBodyDto, UpdateProductVariantDto } from './dto/update-product.dto';
import { PRODUCT_FILTERS_MAP } from './product.filters';
import { PRODUCT_SORTABLE_FIELDS } from './product.sort';

@Injectable()
export class ProductService {
  constructor(private prisma: PrismaService) {}

  static readonly productSelectFields = {
    id: true,
    name: true,
    categoryId: true,
    isVariable: true,
    variants: {
      where: { deletedAt: null },
      select: {
        id: true,
        color: true,
        size: true,
        costPrice: true,
        salePrice: true,
        quantity: true,
        _count: { select: { saleItems: true } },
      },
    },
  } satisfies Prisma.ProductSelect;

  private toProductEditDto(product: Prisma.ProductGetPayload<{ select: typeof ProductService.productSelectFields }>) {
    if (product.isVariable) {
      const variantsWithoutCount = product.variants.map(({ _count, ...v }) => ({
        ...v,
        hasSales: _count.saleItems > 0,
      }));
      const itemCount = product.variants.reduce((prev, curr) => prev + curr._count.saleItems, 0);

      return {
        ...product,
        itemCount,
        variants: variantsWithoutCount,
      };
    } else {
      const { costPrice, salePrice, quantity, _count } = product.variants[0];
      const itemCount = _count.saleItems;

      return {
        ...product,
        itemCount,
        costPrice,
        salePrice,
        quantity,
      };
    }
  }

  async findOne(id: string) {
    const product = await this.prisma.product.findFirstOrThrow({
      where: { id },
      select: ProductService.productSelectFields,
    });

    return this.toProductEditDto(product);
  }

  async listTable(options: ListProductsQueryDto, filter: ListProductsBodyDto) {
    const sort = buildPrismaSort(options, PRODUCT_SORTABLE_FIELDS);
    const pagination = buildPrismaPagination(options);

    const queries = buildPrismaFilter(filter, PRODUCT_FILTERS_MAP);

    const count = await this.prisma.productStats.count({
      where: {
        ...queries,
        name: { startsWith: options.search },
      },
    });

    const rows = await this.prisma.productStats.findMany({
      where: {
        ...queries,
        name: { startsWith: options.search },
      },
      orderBy: sort || { id: 'desc' },
      ...pagination,
    });

    const mappedRows = rows.map(({ categoryId, categoryName, ...row }) => ({
      ...row,
      category: { id: categoryId, name: categoryName },
    }));

    const result = {
      rowCount: count,
      pageCount: Math.ceil(count / 10),
      rows: mappedRows,
    };

    return result;
  }

  async create({ categoryId, ...data }: CreateProductBodyDto) {
    const isVariable = data.type === 'variable';

    const variants = isVariable
      ? data.variants
      : [
          {
            costPrice: data.costPrice,
            salePrice: data.salePrice,
            quantity: data.quantity,
          },
        ];

    const createdProduct = await this.prisma.$transaction(async (tx) => {
      const product = await tx.product.create({
        data: {
          name: data.name,
          isVariable,
          categoryId,
        },
        select: ProductService.productSelectFields,
      });

      const newVariants = [];

      for (const v of variants) {
        const newVariant = await this.createVariant(product.id, v, tx);

        newVariants.push(newVariant);
      }

      return {
        ...product,
        variants: newVariants,
      };
    });

    return this.toProductEditDto(createdProduct);
  }

  private async createVariant(
    productId: string,
    variant: CreateProductVariantDto,
    prismaClient: Prisma.TransactionClient | PrismaClient = this.prisma,
  ) {
    return await prismaClient.productVariant.upsert({
      where: {
        productId_color_size: {
          productId,
          color: variant.color || '',
          size: variant.size || '',
        },
      },
      update: {
        deletedAt: null,
        quantity: variant.quantity,
        costPrice: variant.costPrice,
        salePrice: variant.salePrice,
      },
      create: {
        productId,
        ...variant,
      },
      select: ProductService.productSelectFields.variants.select,
    });
  }

  private async updateVariant(
    id: string,
    variant: Partial<UpdateProductVariantDto>,
    prismaClient: Prisma.TransactionClient | PrismaClient = this.prisma,
  ) {
    await prismaClient.productVariant.update({
      where: { id },
      data: variant,
    });
  }

  private async removeVariant(id: string, prismaClient: Prisma.TransactionClient | PrismaClient = this.prisma) {
    const foundVariant = await prismaClient.productVariant.findFirstOrThrow({
      where: { id: id },
      select: { quantity: true, _count: { select: { saleItems: true } } },
    });

    if (foundVariant._count.saleItems > 0) {
      const currentDate = DateTime.now().setZone('America/Sao_Paulo').toJSDate();

      await prismaClient.productVariant.update({
        where: { id: id },
        data: {
          deletedAt: currentDate,
          quantity: 0,
        },
      });
    } else {
      await prismaClient.productVariant.delete({
        where: { id: id },
      });
    }
  }

  async update(productId: string, data: UpdateProductBodyDto) {
    const result = await this.prisma.$transaction(async (tx) => {
      const foundProduct = await tx.product.findFirstOrThrow({
        where: { id: productId },
        select: {
          isVariable: true,
          variants: { select: { id: true, costPrice: true, salePrice: true, quantity: true, deletedAt: true } },
        },
      });

      const isNowVariable = data.type === 'variable';

      if (foundProduct.isVariable && !isNowVariable) {
        // mudou: variado -> simples

        const variantsToRemove = foundProduct.variants.filter((v) => !v.deletedAt);
        await Promise.all(variantsToRemove.map(({ id }) => this.removeVariant(id, tx)));

        const { costPrice, salePrice, quantity } = data;
        await this.createVariant(productId, { color: '', size: '', costPrice, salePrice, quantity }, tx);
      }

      if (!foundProduct.isVariable && isNowVariable) {
        // mudou: simples -> variado

        const defaultVariant = foundProduct.variants.find((v) => !v.deletedAt);

        if (defaultVariant) {
          await this.removeVariant(defaultVariant.id, tx);
        }

        await Promise.all(data.variants.map(({ id, status, ...v }) => this.createVariant(productId, v, tx)));
      }

      if (!foundProduct.isVariable && !isNowVariable) {
        // manteve: simples -> simples

        const { id, deletedAt, ...defaultVariant } = foundProduct.variants.find((v) => !v.deletedAt) ?? {};

        if (id) {
          const newVariant = { costPrice: data.costPrice, salePrice: data.salePrice };
          const canUpdateVariant = !util.isDeepStrictEqual(defaultVariant, newVariant);

          if (canUpdateVariant) {
            await this.updateVariant(id, newVariant, tx);
          }
        }
      }

      if (foundProduct.isVariable && isNowVariable) {
        // manteve: variado -> variado

        const removedVariants = data.variants.filter((v) => v.status === 'removed');
        const addedVariants = data.variants.filter((v) => v.status === 'added');
        const modifiedVariants = data.variants.filter((v) => v.status === 'modified');

        await Promise.all(removedVariants.map(({ id }) => this.removeVariant(id, tx)));
        await Promise.all(addedVariants.map(({ status, ...v }) => this.createVariant(productId, v, tx)));
        await Promise.all(modifiedVariants.map(({ status, quantity, id, ...v }) => this.updateVariant(id, v, tx)));
      }

      const updatedProduct = await tx.product.update({
        where: { id: productId },
        data: {
          name: data.name,
          isVariable: isNowVariable,
        },
        select: ProductService.productSelectFields,
      });

      return updatedProduct;
    });

    return this.toProductEditDto(result);
  }

  async findVariants(productId: string) {
    const variants = await this.prisma.productVariant.findMany({
      where: { productId, deletedAt: null },
      select: {
        id: true,
        color: true,
        size: true,
        quantity: true,
        averageCost: true,
        costPrice: true,
        salePrice: true,
      },
    });

    return variants;
  }

  async delete(id: string) {
    const now = DateTime.now().setZone('America/Sao_Paulo').toJSDate();

    await this.prisma.$transaction(async (tx) => {
      const hasSales = await tx.productVariant.findFirst({
        where: {
          productId: id,
          saleItems: { some: {} },
        },
        select: { id: true },
      });

      if (hasSales) {
        // arquiva todas as variantes e o produto
        await tx.product.update({
          where: { id },
          data: {
            deletedAt: now,
            variants: {
              updateMany: {
                where: { deletedAt: null },
                data: { deletedAt: now },
              },
            },
          },
        });
      } else {
        // exclui todas as variantes e o produto
        await tx.productVariant.deleteMany({
          where: { productId: id },
        });

        await tx.product.delete({
          where: { id },
        });
      }
    });
  }

  async bulkDelete({ ids }: BulkDeleteProductsBodyDto) {
    const now = DateTime.now().setZone('America/Sao_Paulo').toJSDate();

    await this.prisma.$transaction(async (tx) => {
      const productsWithSales = await tx.product.findMany({
        where: {
          id: { in: ids },
          variants: {
            some: { saleItems: { some: {} } },
          },
        },
        select: { id: true },
      });

      const idsWithSales = new Set(productsWithSales.map((p) => p.id));

      const toSoftDelete = ids.filter((id) => idsWithSales.has(id));
      const toHardDelete = ids.filter((id) => !idsWithSales.has(id));

      // soft-delete
      if (toSoftDelete.length > 0) {
        await tx.product.updateMany({
          where: {
            id: { in: toSoftDelete },
            deletedAt: null,
          },
          data: {
            deletedAt: now,
          },
        });

        await tx.productVariant.updateMany({
          where: {
            productId: { in: toSoftDelete },
            deletedAt: null,
          },
          data: {
            deletedAt: now,
          },
        });
      }

      // hard-delete
      if (toHardDelete.length > 0) {
        await tx.productVariant.deleteMany({
          where: { productId: { in: toHardDelete } },
        });

        await tx.product.deleteMany({
          where: { id: { in: toHardDelete } },
        });
      }
    });
  }
}
