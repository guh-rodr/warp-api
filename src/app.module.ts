import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { HealthModule } from './health/health.module';
import { AuthModule } from './modules/auth/auth.module';
import { TransactionModule } from './modules/cashflow/transaction.module';
import { CategoryModule } from './modules/category/category.module';
import { CustomerModule } from './modules/customer/customer.module';
import { ProductModule } from './modules/product/product.module';
import { ReceivableModule } from './modules/receivable/receivable.module';
import { SaleModule } from './modules/sales/sale.module';
import { StatsModule } from './modules/stats/stats.module';
import { StockMovementModule } from './modules/stock-movement/stock-movement.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    HealthModule,
    AuthModule,
    CustomerModule,
    SaleModule,
    CategoryModule,
    StatsModule,
    TransactionModule,
    ProductModule,
    StockMovementModule,
    ReceivableModule,
  ],
})
export class AppModule {}
