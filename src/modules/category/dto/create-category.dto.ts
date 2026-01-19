import { Type } from 'class-transformer';
import { IsArray, IsNotEmpty, IsString, ValidateNested } from 'class-validator';
import { CreateModelBodyDto } from 'src/modules/model/dto/create-model.dto';

export class CreateCategoryBodyDto {
  @IsString()
  @IsNotEmpty()
  name: string;

  @IsArray()
  @ValidateNested()
  @Type(() => CreateModelBodyDto)
  models: CreateModelBodyDto[];
}
