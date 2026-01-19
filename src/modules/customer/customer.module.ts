import { Module } from '@nestjs/common';
import { PrismaService } from 'src/prisma.service';
import { CustomerController } from './customer.controller';
import { CustomerService } from './customer.service';

@Module({
  imports: [],
  controllers: [CustomerController],
  providers: [PrismaService, CustomerService],
})
export class CustomerModule {}
