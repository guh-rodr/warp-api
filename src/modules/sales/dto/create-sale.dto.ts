import { Transform, Type } from 'class-transformer';
import {
  IsArray,
  IsISO8601,
  IsNotEmpty,
  IsNumber,
  IsObject,
  IsOptional,
  IsString,
  ValidateNested,
} from 'class-validator';
import { toCents } from 'src/common/utils/currency.util';
import { CreateInstallmentBodyDto } from './create-installment.dto';

class SaleItem {
  @IsString()
  @IsNotEmpty()
  modelId: string;

  @IsString()
  @IsNotEmpty()
  color: string;

  @IsString()
  @IsNotEmpty()
  print: string;

  @IsString()
  @IsNotEmpty()
  size: string;

  @IsNumber()
  @Transform(({ value }) => toCents(value))
  costPrice: number;

  @IsNumber()
  @Transform(({ value }) => toCents(value))
  salePrice: number;
}

export class CreateSaleBodyDto {
  @IsString()
  @IsNotEmpty()
  @IsOptional()
  customerId?: string;

  @IsNotEmpty()
  @IsISO8601({ strict: true })
  purchasedAt: string;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => SaleItem)
  items: SaleItem[];

  @IsObject()
  @IsOptional()
  @ValidateNested()
  @Type(() => CreateInstallmentBodyDto)
  installment: CreateInstallmentBodyDto | null;
}
