import { Transform } from 'class-transformer';
import { IsDateString, IsIn, IsNotEmpty, IsNumber, IsString } from 'class-validator';
import { toCents } from 'src/common/utils/currency.util';

export class CreateTransactionBodyDto {
  @IsString()
  @IsNotEmpty()
  description: string;

  @IsString()
  @IsNotEmpty()
  category: string;

  @IsIn(['INFLOW', 'OUTFLOW'])
  flow: 'INFLOW' | 'OUTFLOW';

  @IsDateString()
  date: string;

  @IsNumber()
  @Transform(({ value }) => toCents(value))
  value: number;
}
