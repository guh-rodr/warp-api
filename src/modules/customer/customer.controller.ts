import { Body, Controller, Delete, Get, HttpCode, Param, Patch, Post, Query } from '@nestjs/common';
import { ApiBody, ApiOperation, ApiQuery, ApiResponse } from '@nestjs/swagger';
import { UnauthorizedErrorResponseDto, ValidationErrorResponseDto } from 'src/common/dtos/error-responses.dto';
import { CustomerService } from './customer.service';
import { CreateCustomerBodyDto } from './dto/create-customer.dto';
import { DeleteManyCustomerBodyDto } from './dto/delete-customer.dto';
import { ListCustomersBodyDto, ListCustomersQueryDto } from './dto/list-customers.dto';
import { UpdateCustomerBodyDto } from './dto/update-customer.dto';

@Controller('/customers')
@ApiResponse({ status: 401, description: 'Erro de autenticação', type: UnauthorizedErrorResponseDto })
export class CustomerController {
  constructor(private readonly customerService: CustomerService) {}

  @ApiOperation({ summary: 'Registra um novo cliente' })
  @ApiResponse({ status: 400, description: 'Erro de validação nos campos enviados', type: ValidationErrorResponseDto })
  @Post()
  create(@Body() body: CreateCustomerBodyDto) {
    return this.customerService.create(body);
  }

  @ApiOperation({ summary: 'Atualiza dados do cliente' })
  @ApiResponse({ status: 404, description: 'Nenhum cliente encontrado com esse ID' })
  @ApiResponse({ status: 400, description: 'Erro de validação nos campos enviados', type: ValidationErrorResponseDto })
  @Patch(':id')
  update(@Param('id') id: string, @Body() body: UpdateCustomerBodyDto) {
    return this.customerService.update(id, body);
  }

  @ApiOperation({ summary: 'Retorna informações gerais do cliente' })
  @ApiResponse({ status: 404, description: 'Nenhum cliente encontrado com esse ID' })
  @Get(':id/overview')
  getInfo(@Param('id') id: string) {
    return this.customerService.getOverview(id);
  }

  @ApiOperation({ summary: 'Retorna uma lista de vendas relacionadas ao cliente' })
  @ApiResponse({ status: 404, description: 'Nenhum cliente encontrado com esse ID' })
  @Get(':id/sales')
  getSales(@Param('id') id: string) {
    return this.customerService.getSales(id);
  }

  @ApiOperation({ summary: 'Retorna métricas e preferências do cliente' })
  @Get(':id/stats')
  @ApiResponse({ status: 404, description: 'Nenhum cliente encontrado com esse ID' })
  getStats(@Param('id') id: string) {
    return this.customerService.getStats(id);
  }

  @ApiOperation({ summary: 'Exclui um cliente' })
  @ApiQuery({
    name: 'deleteSales',
    required: false,
    type: Boolean,
    default: false,
    description: 'Determina se as vendas devem ser excluídas',
  })
  @ApiResponse({ status: 404, description: 'Nenhum cliente encontrado com esse ID' })
  @ApiResponse({ status: 204, description: 'Cliente excluído com sucesso' })
  @HttpCode(204)
  @Delete(':id')
  delete(@Param('id') id: string) {
    return this.customerService.delete(id);
  }

  @ApiOperation({ summary: 'Exclui múltiplos clientes' })
  @ApiQuery({
    name: 'deleteSales',
    required: false,
    type: Boolean,
    default: false,
    description: 'Determina se as vendas devem ser excluídas',
  })
  @ApiResponse({ status: 204, description: 'Clientes excluídos com sucesso' })
  @ApiResponse({ status: 400, description: 'Erro de validação nos campos enviados', type: ValidationErrorResponseDto })
  @HttpCode(204)
  @Delete()
  deleteMany(@Body() body: DeleteManyCustomerBodyDto) {
    return this.customerService.deleteMany(body);
  }

  @ApiOperation({ summary: 'Retorna os 5 primeiros clientes relacionados a uma busca (id e name apenas)' })
  @Get('/autocomplete')
  listAutocomplete(@Query('search') search: string) {
    return this.customerService.listAutocomplete(search || '');
  }

  @ApiOperation({
    summary: 'Retorna os clientes a serem listados na tabela',
    description: 'Essa rota aceita filtros dinâmicos, por isso a decisão de usar o método POST',
  })
  @ApiBody({ required: false, type: ListCustomersBodyDto })
  @ApiResponse({ status: 400, description: 'Erro de validação nos campos enviados', type: ValidationErrorResponseDto })
  @HttpCode(200)
  @Post('/list')
  listTable(@Query() query: ListCustomersQueryDto, @Body() body: ListCustomersBodyDto) {
    return this.customerService.listTable(
      {
        page: query.page || 1,
        search: query.search || '',
        ...query,
      },
      body,
    );
  }
}
