import { PartialType } from '@nestjs/mapped-types';
import { CreateCustomerBodyDto } from './create-customer.dto';

export class UpdateCustomerBodyDto extends PartialType(CreateCustomerBodyDto) {}
