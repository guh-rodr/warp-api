import { Transform } from 'class-transformer';
import {
  ArrayNotEmpty,
  IsArray,
  IsDateString,
  IsEnum,
  IsISO8601,
  IsNotEmpty,
  IsNumber,
  IsString,
} from 'class-validator';
import { PaymentType } from 'generated/prisma/enums';
import { toCents } from 'src/common/utils/currency.util';

export class CreateReceivableBodyDto {
  @IsString()
  @IsNotEmpty()
  customerId: string;

  @IsNumber()
  @Transform(({ value }) => toCents(value))
  total: number;

  @IsDateString()
  occurredAt: string;

  @IsDateString({ strict: true })
  dueAt: string;

  @IsString()
  @IsNotEmpty()
  description: string;
}

export class ReverseReceivableBodyDto {
  @IsArray()
  @ArrayNotEmpty()
  @IsString({ each: true })
  allocations: string[];

  @IsNotEmpty()
  @IsISO8601({ strict: true })
  date: string;

  @IsEnum(PaymentType)
  reason: PaymentType;
}
