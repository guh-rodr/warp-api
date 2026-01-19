import { Type } from 'class-transformer';
import { IsInt, IsOptional, IsString } from 'class-validator';
import { FilterDto } from 'src/common/types/filter.type';
import { SortDto } from 'src/common/types/sort.type';

export class ListCustomersQueryDto extends SortDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  page?: number;

  @IsOptional()
  @IsString()
  search?: string;

  @IsOptional()
  @IsString()
  autocomplete?: string;
}

export class ListCustomersBodyDto extends FilterDto {}
