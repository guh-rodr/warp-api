import { Transform } from 'class-transformer';
import { IsISO8601, IsNotEmpty, IsNumber } from 'class-validator';
import { toCents } from 'src/common/utils/currency.util';

export class CreateInstallmentBodyDto {
  @IsNumber()
  @Transform(({ value }) => toCents(value))
  value: number;

  @IsNotEmpty()
  @IsISO8601({ strict: true })
  paidAt: string;
}
