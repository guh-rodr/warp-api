import { SetMetadata } from '@nestjs/common';

// decorator para definir rotas públicas que não exigem autenticação

export const IS_PUBLIC_KEY = 'isPublic';
export const Public = () => SetMetadata(IS_PUBLIC_KEY, true);
