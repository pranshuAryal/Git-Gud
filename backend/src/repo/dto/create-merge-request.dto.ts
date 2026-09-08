import { IsObject, IsOptional, IsString, MinLength } from 'class-validator';

export class CreateMergeRequestDto {
  @IsString()
  @MinLength(1)
  noteId: string;

  @IsString()
  @MinLength(1)
  title: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsObject()
  content: any;
}
