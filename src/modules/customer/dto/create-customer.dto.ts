import { IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class CreateCustomerBodyDto {
  @IsString()
  @IsNotEmpty()
  name: string;

  @IsOptional()
  @IsString()
  phone?: string;

  @IsString()
  @IsOptional()
  note?: string;
}
