import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { verifyToken } from '../utils/jwt.utils';

@Injectable()
export class JwtAuthGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const req = context.switchToHttp().getRequest();
    const token = req.cookies?.gitgud_token;

    if (!token) {
      throw new UnauthorizedException('No token provided');
    }

    try {
      const payload = verifyToken(token);
      req.user = {
        userId: payload.sub,
        email: payload.email,
        username: payload.username,
      };
      return true;
    } catch {
      throw new UnauthorizedException('Invalid or expired token');
    }
  }
}
