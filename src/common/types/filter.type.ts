import { Type } from 'class-transformer';
import { IsArray, IsIn, IsNotEmpty, IsOptional, IsString, ValidateNested } from 'class-validator';

export class SingleFilter {
  @IsString()
  @IsNotEmpty()
  field: string;

  @IsString()
  @IsNotEmpty()
  operator: string;

  @IsOptional()
  @IsNotEmpty()
  value?: string;
}

export class FilterDto {
  @IsOptional()
  @IsIn(['OR', 'AND'])
  logical?: 'OR' | 'AND';

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => SingleFilter)
  filters?: SingleFilter[];
}
