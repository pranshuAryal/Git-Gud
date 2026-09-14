import { IsOptional, IsString, Matches, MaxLength } from 'class-validator';

export class UpdateProfileDto {
  @IsOptional()
  @Matches(/^[a-zA-Z0-9_]{3,20}$/, {
    message:
      'Username must be 3-20 characters, letters, numbers, or underscores only',
  })
  username?: string;

  @IsOptional()
  @IsString()
  @MaxLength(80)
  name?: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  bio?: string;
}
