import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsInt, IsOptional, IsString } from 'class-validator';
import { FilterDto } from 'src/common/types/filter.type';
import { SortDto } from 'src/common/types/sort.type';

export class ListStockMovementsQueryDto extends SortDto {
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

export class ListStockMovementsBodyDto extends FilterDto {}
