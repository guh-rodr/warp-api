import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AuthModule } from './modules/auth/auth.module';
import { TransactionModule } from './modules/cashflow/transaction.module';
import { CategoryModule } from './modules/category/category.module';
import { CustomerModule } from './modules/customer/customer.module';
import { ModelModule } from './modules/model/model.module';
import { SaleModule } from './modules/sales/sale.module';
import { StatsModule } from './modules/stats/stats.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    AuthModule,
    CustomerModule,
    SaleModule,
    CategoryModule,
    StatsModule,
    TransactionModule,
    ModelModule,
  ],
})
export class AppModule {}
