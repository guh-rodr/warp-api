import { Transform } from 'class-transformer';
import { IsNotEmpty, IsNumber, IsOptional, IsString } from 'class-validator';
import { toCents } from 'src/common/utils/currency.util';

export class CreateModelBodyDto {
  @IsString()
  @IsNotEmpty()
  name: string;

  @IsNumber()
  @IsOptional()
  @Transform(({ value }) => (value ? toCents(value) : undefined))
  costPrice?: number;

  @IsNumber()
  @IsOptional()
  @Transform(({ value }) => (value ? toCents(value) : undefined))
  salePrice?: number;
}
