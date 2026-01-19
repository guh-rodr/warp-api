import { IsArray } from 'class-validator';

export class DeleteManyCustomerBodyDto {
  @IsArray()
  ids: string[];
}
