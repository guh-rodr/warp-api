import { BadRequestException } from '@nestjs/common';
import { SortDto } from '../types/sort.type';

export function buildPrismaSort(dto: SortDto | undefined, mappings: string[]) {
  if (!dto.sortBy) return undefined;

  const isInvalidField = dto.sortBy && !mappings.find((m) => m === dto.sortBy);

  if (isInvalidField) {
    throw new BadRequestException(`A coluna '${dto.sortBy}' é inválida para ordenação.`);
  }

  const fieldToSort = dto.sortBy;
  const sortDir = dto.sortDir || 'asc';

  return {
    [fieldToSort]: sortDir,
  };
}
