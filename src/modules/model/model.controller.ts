import { Body, Controller, Delete, Param, Patch, Post } from '@nestjs/common';
import { CreateModelBodyDto } from './dto/create-model.dto';
import { UpdateModelBodyDto } from './dto/update-model.dto';
import { ModelService } from './model.service';

@Controller('/categories/:cid/models')
export class ModelController {
  constructor(private readonly modelService: ModelService) {}

  @Delete(':id')
  delete(@Param('id') id: string) {
    return this.modelService.delete(id);
  }

  @Post()
  create(@Param('cid') categoryId: string, @Body() body: CreateModelBodyDto) {
    return this.modelService.create(categoryId, body);
  }

  @Patch(':id')
  update(@Param('cid') categoryId: string, @Param('id') modelId: string, @Body() body: UpdateModelBodyDto) {
    return this.modelService.update(categoryId, modelId, body);
  }
}
