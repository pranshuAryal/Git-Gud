// backend/src/common/jwt.util.ts
import * as jwt from 'jsonwebtoken';
import { UserRecord } from 'src/types/auth';

export interface JwtPayload {
  sub: string;
  email: string;
  username: string;
}

const JWT_SECRET = process.env.JWT_SECRET || 'dev-secret-change-me';

export function verifyToken(token: string): JwtPayload {
  return jwt.verify(token, JWT_SECRET) as JwtPayload;
}

export function issueToken(user: UserRecord) {
  const token = jwt.sign(
    {
      sub: user.id,
      email: user.email,
      username: user.username,
    },
    JWT_SECRET,
    {
      expiresIn: '7d',
    },
  );

  return {
    token,
    user: {
      id: user.id,
      email: user.email,
      username: user.username,
    },
  };
}
