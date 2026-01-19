import { BadRequestException } from '@nestjs/common';
import { DateTime } from 'luxon';
import { FilterDto, SingleFilter } from '../types/filter.type';
import { toCents } from './currency.util';

type FilterMap = Record<string, { type: string }>;

const FILTER_TRANSFORMERS = {
  text: (f: SingleFilter) => ({
    equals: { [f.field]: f.value },
    not_equals: { [f.field]: { not: f.value } },
    contains: { [f.field]: { contains: f.value } },
    not_contains: { [f.field]: { not: { contains: f.value } } },
    starts_with: { [f.field]: { startsWith: f.value } },
    ends_with: { [f.field]: { endsWith: f.value } },
  }),
  boolean: (f: SingleFilter) => ({
    equals: { [f.field]: f.value },
    not_equals: { [f.field]: { not: f.value } },
  }),
  number: (f: SingleFilter) => ({
    equals: { [f.field]: toCents(+f.value) },
    not_equals: { [f.field]: { not: toCents(+f.value) } },
    greater_than: { [f.field]: { gt: toCents(+f.value) } },
    less_than: { [f.field]: { lt: toCents(+f.value) } },
  }),
  date: (f: SingleFilter) => {
    const date = DateTime.fromISO(f.value, { zone: 'America/Sao_Paulo' });
    const start = date.startOf('day');
    const end = date.endOf('day');

    return {
      equals: { [f.field]: { gte: start.toJSDate(), lte: end.toJSDate() } },
      not_equals: { [f.field]: { not: { gte: start.toJSDate(), lte: end.toJSDate() } } },
      before: { [f.field]: { lt: start.toJSDate() } },
      after: { [f.field]: { gt: end.toJSDate() } },
    };
  },
} as const;

export function buildPrismaFilter({ filters, logical }: FilterDto, map: FilterMap) {
  const queries = filters.map((filter) => {
    const field = map[filter.field];

    if (!field) {
      throw new BadRequestException(`O campo '${filter.field}' é inválido.`);
    }

    const transformer = FILTER_TRANSFORMERS[field.type];
    const typeQueries = transformer ? transformer(filter) : null;
    const query = typeQueries?.[filter.operator];

    if (!query) {
      throw new BadRequestException(`A operação '${filter.operator}' é inválida para a coluna '${filter.field}'.`);
    }

    return query;
  });

  return { [logical]: queries };
}
