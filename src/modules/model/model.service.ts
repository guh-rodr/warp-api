import { Injectable } from '@nestjs/common';
import { PrismaService } from 'src/prisma.service';
import { CreateModelBodyDto } from './dto/create-model.dto';
import { UpdateModelBodyDto } from './dto/update-model.dto';

@Injectable()
export class ModelService {
  constructor(private prisma: PrismaService) {}

  private readonly modelSelect = {
    id: true,
    name: true,
    category: {
      select: {
        id: true,
        name: true,
      },
    },
    costPrice: true,
    salePrice: true,
    _count: { select: { items: true } },
  } as const;

  async create(category: string, data: CreateModelBodyDto) {
    const { _count, ...model } = await this.prisma.model.create({
      data: {
        ...data,
        category: {
          connectOrCreate: {
            where: { id: category },
            create: { name: category },
          },
        },
      },
      select: this.modelSelect,
    });

    const result = {
      ...model,
      itemCount: _count.items,
    };

    return result;
  }

  async update(categoryId: string, modelId: string, data: UpdateModelBodyDto) {
    const { _count, ...model } = await this.prisma.model.update({
      where: {
        categoryId,
        id: modelId,
      },
      data,
      select: this.modelSelect,
    });

    const result = {
      ...model,
      itemCount: _count.items,
    };

    return result;
  }

  async delete(id: string) {
    const model = await this.prisma.model.delete({ where: { id } });

    return model;
  }
}
