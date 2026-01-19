import { Body, Controller, Delete, Get, Param, Patch, Post, Query } from '@nestjs/common';
import { CategoryService } from './category.service';
import { CreateCategoryBodyDto } from './dto/create-category.dto';
import { UpdateCategoryBodyDto } from './dto/update-category.dto';

@Controller('categories')
export class CategoryController {
  constructor(private readonly categoryService: CategoryService) {}

  @Get('/autocomplete')
  listAutocomplete(@Query('search') search: string, @Query('fetchModels') fetchModels?: string) {
    return this.categoryService.listAutocomplete(search, fetchModels === 'true');
  }

  @Get()
  list(@Query('search') search?: string, @Query('fetchModels') fetchModels?: string) {
    return this.categoryService.list({
      search,
      fetchModels: fetchModels === 'true',
    });
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() body: UpdateCategoryBodyDto) {
    return this.categoryService.update(id, body);
  }

  @Delete(':id')
  delete(@Param('id') id: string) {
    return this.categoryService.delete(id);
  }

  @Post()
  create(@Body() body: CreateCategoryBodyDto) {
    return this.categoryService.create(body);
  }
}
