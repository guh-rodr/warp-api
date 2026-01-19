import { PartialType } from '@nestjs/mapped-types';
import { CreateSaleBodyDto } from './create-sale.dto';

export class UpdateSaleBodyDto extends PartialType(CreateSaleBodyDto) {}
