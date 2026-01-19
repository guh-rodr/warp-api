import { IsArray } from 'class-validator';

export class DeleteManyTransactionBodyDto {
  @IsArray()
  ids: string[];
}
