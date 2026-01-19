import { IsEmail, IsString, MaxLength } from 'class-validator';

export class SignInUserBodyDto {
  @IsString()
  @IsEmail({}, { message: 'Insira um email válido.' })
  @MaxLength(100, { message: 'O email tem um limite de 100 caracteres.' })
  email: string;

  @IsString({ message: 'Insira uma senha válido.' })
  @MaxLength(100, { message: 'A senha tem um limite de 100 caracteres.' })
  password: string;
}
