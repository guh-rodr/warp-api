import { Transform } from 'class-transformer';
import { IsEnum, IsInt, IsISO8601, IsNotEmpty, IsOptional, IsString } from 'class-validator';
import { StockMovementType } from 'generated/prisma/enums';
import { toCents } from 'src/common/utils/currency.util';

export class CreateStockMovementBodyDto {
  @IsEnum(StockMovementType)
  type: StockMovementType;

  @IsString()
  @IsNotEmpty()
  variantId: string;

  @IsString()
  @IsOptional()
  reason?: string;

  @IsOptional()
  @IsInt()
  @Transform(({ value }) => toCents(value))
  unitCost: number;

  @IsInt()
  quantity: number;

  @IsNotEmpty()
  @IsISO8601({ strict: true })
  date: string;
}
