import { Module } from '@nestjs/common';
import { StatsController } from './stats.controller';
import { StatsService } from './stats.service';
import { PrismaService } from 'src/prisma.service';

@Module({
  imports: [],
  controllers: [StatsController],
  providers: [PrismaService, StatsService],
})
export class StatsModule {}
