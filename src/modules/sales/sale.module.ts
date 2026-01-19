import { Module } from '@nestjs/common';
import { PrismaService } from 'src/prisma.service';
import { SaleController } from './sale.controller';
import { SaleService } from './sale.service';

@Module({
  imports: [],
  controllers: [SaleController],
  providers: [PrismaService, SaleService],
})
export class SaleModule {}
