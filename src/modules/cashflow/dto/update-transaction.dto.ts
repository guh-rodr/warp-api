import { PartialType } from '@nestjs/mapped-types';
import { CreateTransactionBodyDto } from './create-transaction.dto';

export class UpdateTransactionBodyDto extends PartialType(CreateTransactionBodyDto) {}
