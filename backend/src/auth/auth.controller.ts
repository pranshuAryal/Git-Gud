import { Body, Controller, Post, Res, HttpCode } from '@nestjs/common';
import type { Response } from 'express';

import { AuthService } from './auth.service';
import { SignupDto, LoginDto } from './dto/auth.dto';
// import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';

const COOKIE_NAME = 'gitgud_token';
const COOKIE_OPTS = {
  httpOnly: true,
  sameSite: 'lax' as const,
  secure: false,
  maxAge: 7 * 24 * 60 * 60 * 1000,
  path: '/',
};

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('signup')
  async signup(
    @Body() dto: SignupDto,
    @Res({ passthrough: true }) res: Response,
  ) {
    const { token, user } = await this.authService.signup(dto);
    res.cookie(COOKIE_NAME, token, COOKIE_OPTS);
    return { user };
  }

  @Post('login')
  @HttpCode(200)
  async login(
    @Body() dto: LoginDto,
    @Res({ passthrough: true }) res: Response,
  ) {
    const { token, user } = await this.authService.login(dto);
    res.cookie(COOKIE_NAME, token, COOKIE_OPTS);
    return { user };
  }

  @Post('logout')
  @HttpCode(200)
  logout(@Res({ passthrough: true }) res: Response) {
    res.clearCookie(COOKIE_NAME, { path: '/' });
    return { success: true };
  }

  // @Get('me')
  // @UseGuards(JwtAuthGuard)
  // me(@CurrentUser() user: { userId: string; email: string; username: string }) {
  //   return user;
  // }
}
