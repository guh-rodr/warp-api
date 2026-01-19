import { Transform } from 'class-transformer';
import { IsDateString, IsNotEmpty, IsNumber, IsString } from 'class-validator';
import { toCents } from 'src/common/utils/currency.util';

export class CreateTransactionBodyDto {
  @IsString()
  @IsNotEmpty()
  description: string;

  @IsString()
  @IsNotEmpty()
  category: string;

  @IsString()
  @IsNotEmpty()
  flow: string;

  @IsDateString()
  date: string;

  @IsNumber()
  @Transform(({ value }) => toCents(value))
  value: number;
}
