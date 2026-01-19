import { Module } from '@nestjs/common';
import { PrismaService } from 'src/prisma.service';
import { TransactionService } from './transaction.service';
import { TransactionController } from './transaction.controller';

@Module({
  imports: [],
  controllers: [TransactionController],
  providers: [PrismaService, TransactionService],
})
export class TransactionModule {}
