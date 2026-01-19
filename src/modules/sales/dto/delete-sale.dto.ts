import { IsArray } from 'class-validator';

export class DeleteManySaleBodyDto {
  @IsArray()
  ids: string[];
}
