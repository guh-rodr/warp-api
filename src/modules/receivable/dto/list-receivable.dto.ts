import { ApiProperty } from '@nestjs/swagger';
import { Transform, Type } from 'class-transformer';
import { IsIn, IsInt, IsISO8601, IsNotEmpty, IsNumber, IsOptional, IsString } from 'class-validator';
import { FilterDto } from 'src/common/types/filter.type';
import { SortDto } from 'src/common/types/sort.type';
import { toCents } from 'src/common/utils/currency.util';

export class ListReceivablesQueryDto extends SortDto {
  @ApiProperty({ example: 1, description: 'Página a ser acessada' })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  page?: number;

  @ApiProperty({ description: 'Buscar por motivo' })
  @IsOptional()
  @IsString()
  search?: string;
}

export class ListReceivablesBodyDto extends FilterDto {}

export class ReceivableDto {
  @IsNotEmpty()
  @IsISO8601({ strict: true })
  dueDate: string;

  @IsNumber()
  @Transform(({ value }) => toCents(value))
  value: number;
}

export class PaymentDto {
  @IsIn(['CASH', 'PIX', 'CREDIT_CARD', 'DEBIT_CARD'])
  method: 'CASH' | 'PIX' | 'CREDIT_CARD' | 'DEBIT_CARD';

  @IsNumber()
  @Transform(({ value }) => toCents(value))
  value: number;
}
