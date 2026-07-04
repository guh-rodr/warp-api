import { Body, Controller, Delete, Get, HttpCode, Param, Post, Query } from '@nestjs/common';
import { ApiBody, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { UnauthorizedErrorResponseDto, ValidationErrorResponseDto } from 'src/common/dtos/error-responses.dto';
import { CreateSaleBodyDto } from './dto/create-sale.dto';
import { DeleteManySaleBodyDto } from './dto/delete-sale.dto';
import { ListSalesBodyDto, ListSalesQueryDto } from './dto/list-sales.dto';
import { SaleService } from './sale.service';

@Controller('/sales')
@ApiResponse({ status: 401, description: 'Erro de autenticação', type: UnauthorizedErrorResponseDto })
export class SaleController {
  constructor(private readonly saleService: SaleService) {}

  @ApiOperation({ summary: 'Registra uma nova venda' })
  @ApiResponse({ status: 400, description: 'Erro de validação nos campos enviados', type: ValidationErrorResponseDto })
  @ApiResponse({ status: 404, description: 'O cliente ou algum dos modelos não foi encontrado' })
  @Post()
  create(@Body() body: CreateSaleBodyDto) {
    return this.saleService.create(body);
  }

  @ApiOperation({
    summary: 'Retorna as vendas a serem listadas na tabela',
    description: 'Essa rota aceita filtros dinâmicos, por isso a decisão de usar o método POST',
  })
  @ApiBody({ required: false, type: ListSalesBodyDto })
  @ApiResponse({ status: 400, description: 'Erro de validação nos campos enviados', type: ValidationErrorResponseDto })
  @HttpCode(200)
  @Post('list')
  listTable(@Query() query: ListSalesQueryDto, @Body() body: ListSalesBodyDto) {
    const params = { ...query, page: query.page, search: query.search };

    return this.saleService.listTable(params, body);
  }

  @ApiOperation({ summary: 'Retorna informações gerais da venda' })
  @ApiResponse({ status: 404, description: 'Nenhuma venda encontrada com esse ID' })
  @Get('/:id/overview')
  getInfo(@Param('id') id: string) {
    return this.saleService.getOverview(id);
  }

  @ApiOperation({ summary: 'Retorna uma lista de itens relacionados a venda' })
  @ApiResponse({ status: 404, description: 'Nenhuma venda encontrada com esse ID' })
  @Get('/:id/items')
  getItems(@Param('id') id: string) {
    return this.saleService.getItems(id);
  }

  @ApiOperation({ summary: 'Exclui uma venda' })
  @ApiResponse({ status: 404, description: 'Nenhuma venda encontrada com esse ID' })
  @ApiResponse({ status: 204, description: 'Venda excluída com sucesso' })
  @HttpCode(204)
  @Delete('/:id')
  delete(@Param('id') id: string) {
    return this.saleService.delete(id);
  }

  @ApiOperation({ summary: 'Exclui múltiplas vendas' })
  @ApiResponse({ status: 204, description: 'Vendas excluídas com sucesso' })
  @HttpCode(204)
  @Delete()
  deleteMany(@Body() body: DeleteManySaleBodyDto) {
    return this.saleService.deleteMany(body);
  }
}
