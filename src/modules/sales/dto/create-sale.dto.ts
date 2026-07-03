import { ApiProperty } from '@nestjs/swagger';
import { Transform, Type } from 'class-transformer';
import {
  IsArray,
  IsIn,
  IsISO8601,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  ValidateIf,
  ValidateNested,
} from 'class-validator';
import { toCents } from 'src/common/utils/currency.util';

class SaleItem {
  @ApiProperty({ description: 'ID do modelo (CUID)', example: 'cmlvoby7y000...' })
  @IsString()
  @IsNotEmpty()
  productId: string;

  @ApiProperty({ description: 'ID da variante (CUID)', example: 'cmlvoby7y000...' })
  @IsString()
  @IsNotEmpty()
  variantId: string;

  @ApiProperty({ description: 'Preço de venda', example: 230 })
  @IsNumber()
  @Transform(({ value }) => toCents(value))
  salePrice: number;
}

class ReceivableDto {
  @IsNotEmpty()
  @IsISO8601({ strict: true })
  dueDate: string;

  @IsNumber()
  @Transform(({ value }) => toCents(value))
  value: number;
}

class PaymentDto {
  @IsIn(['CASH', 'PIX', 'CREDIT_CARD', 'DEBIT_CARD'])
  method: 'CASH' | 'PIX' | 'CREDIT_CARD' | 'DEBIT_CARD';

  @IsNumber()
  @Transform(({ value }) => toCents(value))
  value: number;
}

class Entry extends PaymentDto {}

export class CreateSaleBodyDto {
  @ApiProperty({ description: 'ID do cliente (CUID)', example: 'ch72gsb32000...' })
  @IsString()
  @IsNotEmpty()
  @IsOptional()
  customerId?: string;

  @ApiProperty({ description: 'Data da compra', example: '2026-01-16' })
  @IsNotEmpty()
  @IsISO8601({ strict: true })
  purchasedAt: string;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => SaleItem)
  items: SaleItem[];

  @IsIn(['IMMEDIATE', 'INSTALLMENT', 'TAB'])
  paymentTerm: 'IMMEDIATE' | 'INSTALLMENT' | 'TAB';

  @ValidateIf((o) => o.paymentTerm === 'INSTALLMENT')
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ReceivableDto)
  receivables: ReceivableDto[];

  @ValidateIf((o) => o.paymentTerm === 'CASH')
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => PaymentDto)
  payments: PaymentDto[];

  @IsOptional()
  @Type(() => Entry)
  @ValidateNested({ each: true })
  entry?: Entry;
}
