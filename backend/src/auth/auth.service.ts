import {
  Injectable,
  ConflictException,
  UnauthorizedException,
} from '@nestjs/common';
import * as bcrypt from 'bcryptjs';
import { PrismaService } from '../prisma/prisma.service';
import { SignupDto, LoginDto } from './dto/auth.dto';
import { issueToken } from 'src/common/utils/jwt.utils';

const SALT_ROUNDS = 10;

@Injectable()
export class AuthService {
  constructor(private readonly prisma: PrismaService) {}

  async signup(dto: SignupDto) {
    const existing = await this.prisma.user.findFirst({
      where: { OR: [{ email: dto.email }, { username: dto.username }] },
    });

    if (existing) {
      const field = existing.email === dto.email ? 'email' : 'username';
      throw new ConflictException(
        `An account with this ${field} already exists`,
      );
    }

    const hashed = await bcrypt.hash(dto.password, SALT_ROUNDS);

    const user = await this.prisma.user.create({
      data: {
        email: dto.email,
        username: dto.username,
        password: hashed,
      },
    });

    return issueToken(user);
  }

  async login(dto: LoginDto) {
    const user = await this.prisma.user.findFirst({
      where: { OR: [{ email: dto.identifier }, { username: dto.identifier }] },
    });

    if (!user) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const matches = await bcrypt.compare(dto.password, user.password);
    if (!matches) {
      throw new UnauthorizedException('Invalid credentials');
    }

    return issueToken(user);
  }
}
