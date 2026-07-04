import { ApiProperty } from '@nestjs/swagger';
import { Color } from '../enums/color.enum';
import { Print } from '../enums/print.enum';
import { Size } from '../enums/size.enum';

export class CreateSaleResponseDto {
  @ApiProperty({ description: 'ID da venda (CUID)', example: 'ch72gsb32000...' })
  id: string;

  @ApiProperty({ description: 'Valor total', example: 230 })
  total: number;

  @ApiProperty({ description: 'Valor total', example: 160 })
  profit: number;

  @ApiProperty({ description: 'Data da compra', example: '2026-01-10T10:30:00.000Z' })
  purchasedAt: Date;

  @ApiProperty({ description: 'Determina se a venda é parcelada ou não', type: Boolean, example: false })
  isInstallment: boolean;

  @ApiProperty({ description: 'ID do cliente (CUID)', example: 'cmlvpl896000...' })
  customerId: string;
}

class SaleCustomer {
  @ApiProperty({ example: 'ch72gsb32000...', description: 'ID do cliente (CUID)' })
  id: string;

  @ApiProperty({ example: 'Gustavo Rodrigues', description: 'Nome completo do cliente' })
  name: string;
}

export class SaleRowDto {
  @ApiProperty({ description: 'ID do cliente (CUID)', example: 'cmlvpl896000...' })
  id: string;

  @ApiProperty({ description: 'Data da compra', example: '2026-01-10T10:30:00.000Z' })
  purchasedAt: Date;

  @ApiProperty({ description: 'Data de registro', example: '2026-01-10T10:30:00.000Z' })
  createdAt: Date;

  @ApiProperty({ description: 'Valor total', example: 230 })
  total: number;

  @ApiProperty({ description: 'Lucro total', example: 160 })
  profit: number;

  @ApiProperty({ description: 'Quantidade de itens', example: 1 })
  itemCount: number;

  @ApiProperty({ example: 'paid', description: 'Status atual', enum: ['paid', 'pending'] })
  status: 'paid' | 'pending';

  @ApiProperty({ type: SaleCustomer, description: 'Cliente' })
  customer: SaleCustomer;
}

export class SaleListResponseDto {
  @ApiProperty({ example: 1, description: 'Quantidade de linhas' })
  rowCount: number;

  @ApiProperty({ example: 1, description: 'Quantidade de páginas' })
  pageCount: number;

  @ApiProperty({ type: [SaleRowDto], description: 'Lista de vendas' })
  rows: SaleRowDto[];
}

export class SaleOverviewResponseDto {
  @ApiProperty({ example: 'paid', description: 'Status atual', enum: ['paid', 'pending'] })
  status: 'paid' | 'pending';

  @ApiProperty({ description: 'Data da compra', example: '2026-01-10T10:30:00.000Z' })
  purchasedAt: Date;

  @ApiProperty({ description: 'Valor total', example: 230 })
  total: number;

  @ApiProperty({ description: 'Lucro total', example: 160 })
  profit: number;

  @ApiProperty({ description: 'Valor recebido até o momento', example: 230 })
  totalReceived: number;

  @ApiProperty({ description: 'Lucro recebido até o momento', example: 160 })
  profitReceived: number;

  @ApiProperty({ type: SaleCustomer, description: 'Cliente' })
  customer: SaleCustomer;
}

export class SaleItemResponseDto {
  @ApiProperty({ example: 'ch72gsb32000...', description: 'ID do item (CUID)' })
  id: string;

  @ApiProperty({ description: 'Nome da categoria', example: 'Camisetas' })
  categoryName: string;

  @ApiProperty({ description: 'Nome do modelo', example: 'Regata' })
  productName: string;

  @ApiProperty({ description: 'Cor', example: 'black', enum: Color })
  color: string;

  @ApiProperty({ description: 'Estampa', example: 'plain', enum: Print })
  print: string;

  @ApiProperty({ description: 'Tamanho', example: 'm', enum: Size })
  size: string;

  @ApiProperty({ description: 'Preço de compra', example: 120 })
  costPrice: number;

  @ApiProperty({ description: 'Preço de venda', example: 230 })
  salePrice: number;
}
