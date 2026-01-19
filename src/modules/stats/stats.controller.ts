import { Controller, Get, Query } from '@nestjs/common';
import { Public } from 'src/common/decorators/public.decorator';
import { StatsService } from './stats.service';
import { Method, Period } from './stats.type';

@Public()
@Controller('stats')
export class StatsController {
  constructor(private readonly statsService: StatsService) {}

  @Get()
  getStats(
    @Query('period') period: Period,
    @Query('method') method: Method,
    @Query('startDate') startDate: string,
    @Query('endDate') endDate: string,
  ) {
    return this.statsService.getStats(period, method, startDate, endDate);
  }
}
