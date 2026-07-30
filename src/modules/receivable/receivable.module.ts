import { Module } from '@nestjs/common';
import { PrismaService } from 'src/prisma.service';
import { ReceivableController } from './receivable.controller';
import { ReceivableService } from './receivable.service';

@Module({
  imports: [],
  controllers: [ReceivableController],
  providers: [PrismaService, ReceivableService],
})
export class ReceivableModule {}
