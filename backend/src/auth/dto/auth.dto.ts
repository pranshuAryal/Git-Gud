import { IsEmail, IsNotEmpty, MinLength, Matches } from 'class-validator';

export class SignupDto {
  @IsEmail()
  email: string;

  @Matches(/^[a-zA-Z0-9_]{3,20}$/, {
    message:
      'Username must be 3-20 characters, letters, numbers, or underscores only',
  })
  username: string;

  @MinLength(8)
  password: string;
}

export class LoginDto {
  @IsNotEmpty()
  identifier: string; // email OR username

  @IsNotEmpty()
  password: string;
}
