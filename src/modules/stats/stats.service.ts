import { Injectable } from '@nestjs/common';
import { DateTime } from 'luxon';
import { PrismaService } from 'src/prisma.service';
import { Method, Period } from './stats.type';

@Injectable()
export class StatsService {
  constructor(private prisma: PrismaService) {}

  private getWeeksOfMonthLabels() {
    const now = DateTime.now().setZone('America/Sao_Paulo');

    const startOfMonth = now.startOf('month');
    const endOfMonth = now.endOf('month');

    const numberOfWeeks = Math.ceil(endOfMonth.diff(startOfMonth, 'weeks').weeks);

    const labels = Array.from(Array(numberOfWeeks)).map((_, idx) => `Semana ${idx + 1}`);

    return labels;
  }

  private getChartLabelsByPeriod(period: Period) {
    const labels: Record<Period, () => string[]> = {
      today: () => [],
      week: () => ['Domingo', 'Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado'],
      month: () => this.getWeeksOfMonthLabels(),
      year: () => [
        'Janeiro',
        'Fevereiro',
        'Março',
        'Abril',
        'Maio',
        'Junho',
        'Julho',
        'Agosto',
        'Setembro',
        'Outubro',
        'Novembro',
        'Dezembro',
      ],
    };

    return labels[period]();
  }

  async getChartData(period: Period, method: Method) {
    const ranges: { start: Date; end: Date }[] = [];
    const labels = this.getChartLabelsByPeriod(period);
    const chartData = new Map<number, { col_1: number; col_2: number }>();

    labels.forEach((_, index) => {
      chartData.set(index, { col_1: 0, col_2: 0 });
    });

    if (period === 'year') {
      let currentMonth = DateTime.now().setZone('America/Sao_Paulo').startOf('year');

      for (var i = 0; i < labels.length; i++) {
        const start = currentMonth;
        const end = currentMonth.endOf('month');

        ranges.push({
          start: start.toJSDate(),
          end: end.toJSDate(),
        });

        currentMonth = currentMonth.plus({ months: 1 });
      }
    }

    if (period === 'month') {
      let startDate = DateTime.now().setZone('America/Sao_Paulo').startOf('month');
      const endOfMonth = startDate.endOf('month');

      for (var i = 0; i < labels.length; i++) {
        let daysUntil = 7 - startDate.weekday;

        const potentialEndDate = startDate.plus({ days: daysUntil }).endOf('day');
        const endDate = potentialEndDate > endOfMonth ? endOfMonth : potentialEndDate;

        ranges.push({
          start: startDate.toJSDate(),
          end: endDate.toJSDate(),
        });

        startDate = endDate.plus({ day: 1 }).startOf('day');
      }
    }

    if (period === 'week') {
      let currentDay = DateTime.now().setZone('America/Sao_Paulo').startOf('week').minus({ days: 1 });

      for (var i = 0; i < labels.length; i++) {
        const start = currentDay.startOf('day');
        const end = currentDay.endOf('day');

        ranges.push({
          start: start.toJSDate(),
          end: end.toJSDate(),
        });

        currentDay = currentDay.plus({ day: 1 });
      }
    }

    if (method === 'cash_basis') {
      await Promise.all(
        ranges.map(async (range, index) => {
          const result = await this.prisma.cashFlowTransaction.groupBy({
            by: ['flow'],
            where: {
              date: {
                gte: range.start,
                lte: range.end,
              },
            },
            _sum: { value: true },
          });

          const totalInflow = result.find((r) => r.flow === 'inflow')?._sum.value ?? 0;
          const totalOutflow = result.find((r) => r.flow === 'outflow')?._sum.value ?? 0;

          chartData.set(index, { col_1: totalInflow, col_2: totalOutflow });
        }),
      );
    }

    if (method === 'accrual_basis') {
      await Promise.all(
        ranges.map(async (range, index) => {
          const sales = await this.prisma.sale.aggregate({
            where: { purchasedAt: { gte: range.start, lte: range.end } },
            _sum: { total: true },
          });

          const items = await this.prisma.saleItem.aggregate({
            where: { sale: { purchasedAt: { gte: range.start, lte: range.end } } },
            _sum: { costPrice: true },
          });

          const groupedTransactions = await this.prisma.cashFlowTransaction.groupBy({
            by: ['flow', 'saleId'],
            where: {
              category: {
                in: ['OPERATIONAL_EXPENSE', 'PERSONNEL_EXPENSE', 'TAX_EXPENSE', 'SALES_REVENUE', 'OTHER_INCOME'],
              },
              date: {
                gte: range.start,
                lte: range.end,
              },
            },
            _sum: { value: true },
          });

          const manualRevenue = groupedTransactions.find((t) => t.flow === 'inflow' && !t.saleId)?._sum.value ?? 0;
          const expensesOutflow = groupedTransactions.find((t) => t.flow === 'outflow')?._sum.value ?? 0;

          const grossRevenue = (sales._sum.total ?? 0) + manualRevenue;
          const costs = (items._sum.costPrice ?? 0) + expensesOutflow;

          chartData.set(index, { col_1: grossRevenue, col_2: costs });
        }),
      );
    }

    return labels.map((label, index) => ({
      label,
      ...chartData.get(index),
    }));
  }

  // --------------------------------------------------------

  async getCardStatsInAccrualBasis(startDate: string, endDate: string) {
    const start = DateTime.fromISO(startDate, { zone: 'America/Sao_Paulo' }).startOf('day').toJSDate();
    const end = DateTime.fromISO(endDate, { zone: 'America/Sao_Paulo' }).endOf('day').toJSDate();

    const [saleAgg, saleItemAgg, transactionsAgg] = await Promise.all([
      this.prisma.sale.aggregate({
        where: { purchasedAt: { gte: start, lte: end } },
        _sum: { total: true },
        _count: { id: true },
      }),

      this.prisma.saleItem.aggregate({
        where: { sale: { purchasedAt: { gte: start, lte: end } } },
        _sum: { costPrice: true },
      }),

      this.prisma.cashFlowTransaction.groupBy({
        by: ['flow', 'saleId'],
        where: {
          category: {
            in: ['OPERATIONAL_EXPENSE', 'PERSONNEL_EXPENSE', 'TAX_EXPENSE', 'SALES_REVENUE', 'OTHER_INCOME'],
          },
          date: {
            gte: start,
            lte: end,
          },
        },
        _sum: { value: true },
      }),
    ]);

    const expensesTotal = transactionsAgg.find((t) => t.flow === 'outflow')?._sum.value ?? 0;
    const manualRevenue = transactionsAgg.find((t) => t.flow === 'inflow' && !t.saleId)?._sum.value ?? 0;

    const saleCount = saleAgg._count.id ?? 0;
    const invoicing = manualRevenue + (saleAgg._sum.total ?? 0);
    const avgTicket = saleCount > 0 ? invoicing / saleCount : 0;

    const cpv = saleItemAgg._sum.costPrice ?? 0;
    const grossProfit = invoicing - cpv;
    const netProfit = grossProfit - expensesTotal;

    return {
      saleCount,
      invoicing,
      avgTicket,
      grossProfit,
      netProfit,
    };
  }

  async getCardStatsInCashBasis(startDate: string, endDate: string) {
    const start = DateTime.fromISO(startDate, { zone: 'America/Sao_Paulo' }).startOf('day').toJSDate();
    const end = DateTime.fromISO(endDate, { zone: 'America/Sao_Paulo' }).endOf('day').toJSDate();

    const [revenueAgg, inflowAgg, outflowAgg, historicalAgg] = await Promise.all([
      this.prisma.cashFlowTransaction.aggregate({
        where: {
          date: { gte: start, lte: end },
          category: 'SALES_REVENUE',
        },
        _sum: { value: true },
      }),

      this.prisma.cashFlowTransaction.aggregate({
        where: { date: { gte: start, lte: end }, flow: 'inflow' },
        _sum: { value: true },
      }),

      this.prisma.cashFlowTransaction.aggregate({
        where: { date: { gte: start, lte: end }, flow: 'outflow' },
        _sum: { value: true },
      }),

      this.prisma.cashFlowTransaction.groupBy({
        by: ['flow'],
        where: { date: { lte: end } },
        _sum: { value: true },
      }),
    ]);

    const receipt = revenueAgg._sum.value ?? 0;
    const inflowTotal = inflowAgg._sum.value ?? 0;
    const outflowTotal = outflowAgg._sum.value ?? 0;

    const periodResult = inflowTotal - outflowTotal;

    const histInflow = historicalAgg.find((x) => x.flow === 'inflow')?._sum.value ?? 0;
    const histOutflow = historicalAgg.find((x) => x.flow === 'outflow')?._sum.value ?? 0;

    const currentBalance = histInflow - histOutflow;

    return {
      receipt,
      periodResult,
      inflow: inflowTotal,
      outflow: outflowTotal,
      balance: currentBalance,
    };
  }

  async getTopCategories(startDate: string, endDate: string) {
    const query = await this.prisma.$queryRaw`
      SELECT
        si.categoryName as category,
        CAST(COUNT(si.id) AS FLOAT) AS count
      FROM SaleItem si
      JOIN Sale s ON si.saleId = s.id
      WHERE s.purchasedAt >= ${startDate} AND s.purchasedAt <= ${endDate}
      GROUP BY category
      ORDER BY count DESC
      LIMIT 5;
    `;

    return query;
  }

  async getStats(period: Period, method: Method, startDate: string, endDate: string) {
    const getStats: Record<Method, unknown> = {
      accrual_basis: this.getCardStatsInAccrualBasis(startDate, endDate),
      cash_basis: this.getCardStatsInCashBasis(startDate, endDate),
    };

    const stats = await getStats[method];
    const topCategories = await this.getTopCategories(startDate, endDate);

    const metricsChart = await this.getChartData(period, method);

    return {
      cards: stats,
      topCategories,
      metricsChart,
    };
  }
}
