import { BadRequestException, Injectable } from '@nestjs/common';
import { Prisma } from 'generated/prisma/browser';
import { PaymentAllocationUncheckedCreateWithoutPaymentInput } from 'generated/prisma/models';
import { DateTime } from 'luxon';
import { buildPrismaFilter } from 'src/common/utils/filter.util';
import { buildPrismaPagination } from 'src/common/utils/pagination.util';
import { buildPrismaSort } from 'src/common/utils/sort.util';
import { PrismaService } from 'src/prisma.service';
import { CreatePaymentsBodyDto } from './dto/create-payments.dto';
import { CreateReceivableBodyDto, ReverseReceivableBodyDto } from './dto/create-receivable.dto';
import { ListReceivablesBodyDto, ListReceivablesQueryDto } from './dto/list-receivable.dto';
import { UpdateReceivableBodyDto } from './dto/update-receivable.dto';
import { RECEIVABLE_FILTERS_MAP } from './receivable.filters';
import { RECEIVABLE_SORTABLE_FIELDS } from './receivable.sort';

@Injectable()
export class ReceivableService {
  constructor(private readonly prismaService: PrismaService) {}

  private async recalcReceivableBalance(tx: Prisma.TransactionClient, receivableId: string) {
    const { _sum } = await tx.paymentAllocation.aggregate({
      where: { receivableId },
      _sum: { amount: true },
    });
    const paid = _sum.amount ?? 0;

    const receivable = await tx.receivable.findUniqueOrThrow({ where: { id: receivableId }, select: { total: true } });
    const status = paid <= 0 ? 'PENDING' : paid >= receivable.total ? 'PAID' : 'PARTIAL';

    return tx.receivable.update({ where: { id: receivableId }, data: { paid, status } });
  }

  async createReceivable(data: CreateReceivableBodyDto) {
    const dueAt = DateTime.fromISO(data.dueAt, { zone: 'America/Sao_Paulo' }).toJSDate();
    const occurredAt = DateTime.fromISO(data.occurredAt, { zone: 'America/Sao_Paulo' }).toJSDate();

    await this.prismaService.receivable.create({
      data: {
        customerId: data.customerId,
        description: data.description,
        status: 'PENDING',
        total: data.total,
        type: 'IMMEDIATE',
        dueAt,
        occurredAt,
      },
    });
  }

  async cancelReceivable(receivableId: string) {
    const receivable = await this.prismaService.receivable.findFirstOrThrow({
      where: { id: receivableId },
      select: {
        paid: true,
        saleId: true,
      },
    });

    if (receivable.paid !== 0) {
      throw new BadRequestException('Estorne todas as allocations antes de excluir ou cancelar esta conta');
    }

    if (receivable.saleId) {
      await this.prismaService.receivable.update({ where: { id: receivableId }, data: { status: 'CANCELLED' } });
      return;
    }

    const allocationCount = await this.prismaService.paymentAllocation.count({ where: { receivableId } });

    if (allocationCount === 0) {
      await this.prismaService.receivable.delete({ where: { id: receivableId } });
    } else {
      await this.prismaService.receivable.update({ where: { id: receivableId }, data: { status: 'CANCELLED' } });
    }
  }

  async uncancelReceivable(receivableId: string) {
    const receivable = await this.prismaService.receivable.findFirstOrThrow({
      where: { id: receivableId },
      select: { status: true },
    });

    if (receivable.status !== 'CANCELLED') {
      throw new BadRequestException('Essa conta não está cancelada');
    }

    await this.prismaService.receivable.update({
      where: { id: receivableId },
      data: {
        status: 'PENDING',
      },
    });
  }

  async updateReceivable(receivableId: string, data: UpdateReceivableBodyDto) {
    const receivable = await this.prismaService.receivable.findFirstOrThrow({
      where: { id: receivableId },
      select: {
        status: true,
        saleId: true,
      },
    });

    if (receivable.status !== 'PENDING') {
      throw new BadRequestException('Essa conta possui registros financeiros ativos');
    }

    if (receivable.saleId) {
      throw new BadRequestException('Não é possível editar uma conta vinculada a uma venda');
    }

    const dates = {
      dueAt: DateTime.fromISO(data.dueAt, { zone: 'America/Sao_Paulo' }).toJSDate(),
      occurredAt: DateTime.fromISO(data.occurredAt, { zone: 'America/Sao_Paulo' }).toJSDate(),
    };

    await this.prismaService.receivable.update({
      where: { id: receivableId },
      data: {
        ...data,
        ...dates,
      },
    });
  }

  async deleteReceivable(receivableId: string) {
    await this.prismaService.receivable.delete({ where: { id: receivableId } });
  }

  async listTable(options: ListReceivablesQueryDto, filter: ListReceivablesBodyDto) {
    const sort = buildPrismaSort(options, RECEIVABLE_SORTABLE_FIELDS);
    const pagination = buildPrismaPagination(options);

    const queries = buildPrismaFilter(filter, RECEIVABLE_FILTERS_MAP);

    const count = await this.prismaService.receivableStats.count({
      where: {
        ...queries,
        description: { startsWith: options.search },
      },
    });

    const rows = await this.prismaService.receivableStats.findMany({
      where: {
        ...queries,
        description: { startsWith: options.search },
      },
      orderBy: sort || { id: 'desc' },
      ...pagination,
    });

    const result = {
      rowCount: count,
      pageCount: Math.ceil(count / 10),
      rows,
    };

    return result;
  }

  async findByCustomer(customerId: string) {
    const receivables = await this.prismaService.receivable.findMany({
      where: { customerId, status: { not: 'PAID' } },
      select: {
        id: true,
        type: true,
        total: true,
        paid: true,
        installmentIdx: true,
        installmentCount: true,
        dueAt: true,
        createdAt: true,
      },
      orderBy: {
        createdAt: 'asc',
      },
    });

    return receivables;
  }

  async findAllocations(receivableId: string) {
    const allocations = await this.prismaService.paymentAllocation.findMany({
      where: {
        receivableId,
        reversalOfId: null,
        reversals: { none: {} },
      },
      select: {
        id: true,
        amount: true,
        payment: {
          select: {
            method: true,
            createdAt: true,
          },
        },
      },
    });

    const mappedAllocations = allocations.map((a) => {
      const { payment, ...allocation } = a;

      return {
        id: allocation.id,
        total: allocation.amount,
        method: payment.method,
        createdAt: payment.createdAt,
      };
    });

    return mappedAllocations;
  }

  async reverseAllocations(receivableId: string, data: ReverseReceivableBodyDto) {
    if (!data.allocations?.length) {
      throw new BadRequestException('Informe ao menos uma alocação para estornar');
    }

    const allocations = await this.prismaService.paymentAllocation.findMany({
      where: { receivableId, id: { in: data.allocations } },
      select: {
        id: true,
        paymentId: true,
        amount: true,
        reversalOfId: true,
        reversals: { select: { id: true } },
        payment: { select: { method: true, customerId: true, transaction: { select: { id: true } } } },
      },
    });

    if (allocations.length !== data.allocations.length) {
      throw new BadRequestException('Uma ou mais alocações informadas são inválidas para esta conta');
    }

    const invalidAllocation = allocations.find((a) => a.reversals.length > 0 || a.reversalOfId !== null);
    if (invalidAllocation) {
      throw new BadRequestException(
        `Allocation ${invalidAllocation.id} já foi estornada ou é, ela própria, um estorno`,
      );
    }

    const date = DateTime.fromISO(data.date, { zone: 'America/Sao_Paulo' }).toJSDate();

    const groupedByPayment = allocations.reduce(
      (acc, a) => {
        (acc[a.paymentId] ??= []).push(a);
        return acc;
      },
      {} as Record<string, typeof allocations>,
    );

    await this.prismaService.$transaction(async (tx) => {
      for (const group of Object.values(groupedByPayment)) {
        const groupTotal = group.reduce((acc, a) => acc + a.amount, 0);

        await tx.payment.create({
          data: {
            total: groupTotal,
            paidAt: date,
            type: data.reason,
            method: group[0].payment.method,
            customerId: group[0].payment.customerId,
            allocations: {
              createMany: { data: group.map((a) => ({ receivableId, amount: -a.amount, reversalOfId: a.id })) },
            },
            transaction: {
              create: {
                category: 'REVERSAL',
                description: data.reason === 'REVERSAL_CORRECTION' ? 'Correção de alocação' : 'Estorno/Reembolso',
                flow: 'OUTFLOW',
                ocurredAt: date,
                origin: 'PAYMENT',
                value: groupTotal,
                reversalOfId: group[0].payment.transaction?.id,
              },
            },
          },
        });
      }

      await this.recalcReceivableBalance(tx, receivableId);
    });
  }

  async createPayments(data: CreatePaymentsBodyDto) {
    return this.prismaService.$transaction(async (tx) => {
      const receivables = await tx.receivable.findMany({
        where: {
          id: { in: data.receivables },
          customerId: data.customerId,
          status: { not: 'PAID' },
        },
        select: { id: true, total: true, paid: true },
        orderBy: { createdAt: 'asc' },
      });

      const foundIds = new Set(receivables.map((r) => r.id));
      const missingId = data.receivables.find((id) => !foundIds.has(id));
      if (missingId) {
        throw new BadRequestException(
          `O recebível '${missingId}' não foi encontrado, não pertence a este cliente, ou já está quitado`,
        );
      }

      const totalDebt = receivables.reduce((acc, r) => acc + (r.total - r.paid), 0);
      if (data.value > totalDebt) {
        throw new BadRequestException(
          `O valor informado (${data.value}) excede o total em aberto das contas selecionadas (${totalDebt})`,
        );
      }

      const now = DateTime.now().setZone('America/Sao_Paulo').toJSDate();
      const allocationsToCreate: PaymentAllocationUncheckedCreateWithoutPaymentInput[] = [];
      let balance = data.value;

      for (const receivable of receivables) {
        if (balance <= 0) break;
        const debt = receivable.total - receivable.paid;

        const applied = Math.min(debt, balance);
        allocationsToCreate.push({ amount: applied, receivableId: receivable.id });

        await tx.receivable.update({
          where: { id: receivable.id },
          data: {
            paid: { increment: applied },
            status: applied === debt ? 'PAID' : 'PARTIAL',
            ...(applied === debt ? { paidAt: now } : {}),
          },
        });

        balance -= applied;
      }

      return tx.payment.create({
        data: {
          type: 'CHARGE',
          customerId: data.customerId,
          method: data.method,
          paidAt: now,
          total: data.value,
          allocations: { createMany: { data: allocationsToCreate } },
          transaction: {
            create: {
              ocurredAt: now,
              origin: 'PAYMENT',
              category: 'SALES_REVENUE',
              description: `Pagamento realizado - ${receivables.length} contas`,
              flow: 'INFLOW',
              value: data.value,
            },
          },
        },
      });
    });
  }
}
