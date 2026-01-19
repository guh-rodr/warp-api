import { Body, Controller, Get, Post, Req, Res } from '@nestjs/common';
import { FastifyReply, FastifyRequest } from 'fastify';
import { Public } from 'src/common/decorators/public.decorator';
import { AuthService } from './auth.service';
import { SignInUserBodyDto } from './dto/signin-user.dto';
import { SignUpUserBodyDto } from './dto/signup-user.dto';

@Public()
@Controller('/auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('/signup')
  async signUp(@Body() body: SignUpUserBodyDto) {
    return this.authService.signUp(body);
  }

  @Post('/signin')
  async signIn(@Body() body: SignInUserBodyDto, @Res({ passthrough: true }) response: FastifyReply) {
    const { user, accessToken, refreshToken } = await this.authService.signIn(body);

    response.setCookie('refreshToken', refreshToken, {
      httpOnly: true,
      sameSite: 'strict',
      path: '/',
      maxAge: 7 * 24 * 60 * 60 * 1000,
    });

    response.setCookie('accessToken', accessToken, {
      httpOnly: true,
      sameSite: 'strict',
      path: '/',
    });

    return user;
  }

  @Post('/signout')
  async signOut(@Req() request: FastifyRequest, @Res({ passthrough: true }) response: FastifyReply) {
    const refreshToken = request.cookies['refreshToken'];

    await this.authService.signOut(refreshToken);

    response.clearCookie('accessToken', { path: '/' });
    response.clearCookie('refreshToken', { path: '/' });
  }

  @Get('/me')
  async getProfile(@Req() request: FastifyRequest) {
    const accessToken = request.cookies['accessToken'];

    return await this.authService.getProfile(accessToken);
  }

  @Post('/refresh')
  async refreshTokens(@Req() request: FastifyRequest, @Res({ passthrough: true }) response: FastifyReply) {
    const oldRefreshToken = request.cookies['refreshToken'];

    const { accessToken, refreshToken } = await this.authService.refreshTokens(oldRefreshToken);

    response.setCookie('refreshToken', refreshToken, {
      httpOnly: true,
      sameSite: 'strict',
      path: '/',
      maxAge: 7 * 24 * 60 * 60 * 1000,
    });

    response.setCookie('accessToken', accessToken, {
      httpOnly: true,
      sameSite: 'strict',
      path: '/',
    });
  }
}
