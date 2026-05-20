import { Module } from '@nestjs/common';
import { PrismaService } from 'src/prisma.service';
import { StockMovementController } from './stock-movement.controller';
import { StockMovementService } from './stock-movement.service';

@Module({
  imports: [],
  controllers: [StockMovementController],
  providers: [PrismaService, StockMovementService],
})
export class StockMovementModule {}
