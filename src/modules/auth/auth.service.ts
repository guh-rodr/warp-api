import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService, JwtSignOptions } from '@nestjs/jwt';
import * as argon2 from 'argon2';
import { randomUUID } from 'crypto';
import { DateTime } from 'luxon';
import { PrismaService } from 'src/prisma.service';
import { SignInUserBodyDto } from './dto/signin-user.dto';
import { SignUpUserBodyDto } from './dto/signup-user.dto';

@Injectable()
export class AuthService {
  constructor(
    private prisma: PrismaService,
    private jwtService: JwtService,
  ) {}
  async signUp(data: SignUpUserBodyDto) {
    const passwordHash = await argon2.hash(data.password);

    await this.prisma.userAccount.create({
      data: {
        ...data,
        password: passwordHash,
      },
    });
  }

  async signIn(data: SignInUserBodyDto) {
    const user = await this.prisma.userAccount.findFirst({
      where: { email: data.email },
    });

    if (!user) {
      throw new UnauthorizedException('O email ou a senha estão incorretos.');
    }

    const isValidPassword = await argon2.verify(user.password, data.password);

    if (!isValidPassword) {
      throw new UnauthorizedException('O email ou a senha estão incorretos.');
    }

    const accessToken = this.jwtService.sign({ sub: user.id, name: user.name }, {
      expiresIn: process.env.ACCESS_TOKEN_EXPIRATION,
    } as JwtSignOptions);

    const refreshToken = this.jwtService.sign(
      {
        sub: user.id,
        jti: randomUUID(),
      },
      { expiresIn: process.env.REFRESH_TOKEN_EXPIRATION } as JwtSignOptions,
    );

    const refreshTokenExpires = DateTime.local().setZone('America/Sao_Paulo').plus({ days: 7 }).toJSDate();

    const createdRefreshToken = await this.prisma.refreshToken.upsert({
      where: { userId: user.id },
      update: {
        token: refreshToken,
        expiresAt: refreshTokenExpires,
      },
      create: {
        userId: user.id,
        token: refreshToken,
        expiresAt: refreshTokenExpires,
      },
    });

    return {
      user: { id: user.id, name: user.name },
      accessToken,
      refreshToken: createdRefreshToken.token,
    };
  }

  async signOut(refreshToken: string) {
    const { sub } = this.jwtService.verify(refreshToken);

    await this.prisma.refreshToken.delete({
      where: { userId: sub },
    });
  }

  async refreshTokens(oldRefreshToken: string) {
    try {
      await this.jwtService.verify(oldRefreshToken);
    } catch {
      throw new UnauthorizedException('Você precisa logar novamente');
    }

    const userRefreshToken = await this.prisma.refreshToken.findFirst({
      where: { token: oldRefreshToken },
      include: {
        user: {
          select: { id: true, name: true },
        },
      },
    });

    if (!userRefreshToken) {
      throw new UnauthorizedException('Você precisa logar novamente');
    }

    const accessToken = this.jwtService.sign({ sub: userRefreshToken.user.id, name: userRefreshToken.user.name }, {
      expiresIn: process.env.ACCESS_TOKEN_EXPIRATION,
    } as JwtSignOptions);

    const refreshToken = this.jwtService.sign(
      {
        sub: userRefreshToken.user.id,
        jti: randomUUID(),
      },
      { expiresIn: process.env.REFRESH_TOKEN_EXPIRATION } as JwtSignOptions,
    );

    const refreshTokenExpires = DateTime.local().setZone('America/Sao_Paulo').plus({ days: 7 }).toJSDate();

    await this.prisma.refreshToken.update({
      where: { id: userRefreshToken.id },
      data: {
        token: refreshToken,
        expiresAt: refreshTokenExpires,
      },
    });

    return { accessToken, refreshToken };
  }

  async getProfile(accessToken: string) {
    if (!accessToken) {
      throw new UnauthorizedException({ error: 'TokenMissing' });
    }

    try {
      const { sub, name } = this.jwtService.verify(accessToken);
      return {
        id: sub,
        name,
      };
    } catch (error) {
      if (error.name === 'TokenExpiredError') {
        throw new UnauthorizedException({ error: 'TokenExpired' });
      }

      throw new UnauthorizedException({ error: 'TokenInvalid' });
    }
  }
}
