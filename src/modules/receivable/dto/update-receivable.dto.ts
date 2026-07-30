import { PartialType } from '@nestjs/mapped-types';
import { CreateReceivableBodyDto } from './create-receivable.dto';

export class UpdateReceivableBodyDto extends PartialType(CreateReceivableBodyDto) {}
