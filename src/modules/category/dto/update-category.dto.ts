import { IsNotEmpty, IsString } from 'class-validator';

export class UpdateCategoryBodyDto {
  @IsString()
  @IsNotEmpty()
  name: string;
}
