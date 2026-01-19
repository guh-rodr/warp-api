import { Type } from 'class-transformer';
import { IsInt, IsOptional, IsString } from 'class-validator';
import { FilterDto } from 'src/common/types/filter.type';
import { SortDto } from 'src/common/types/sort.type';

export class ListSalesQueryDto extends SortDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  page?: number = 1;

  @IsOptional()
  @IsString()
  search?: string = '';
}

export class ListSalesBodyDto extends FilterDto {}
