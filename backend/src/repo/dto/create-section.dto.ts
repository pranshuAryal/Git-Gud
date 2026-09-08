import {
  IsString,
  IsOptional,
  IsInt,
  IsUUID,
  MinLength,
} from 'class-validator';

export class CreateSectionDto {
  @IsString()
  @MinLength(1)
  title: string;

  @IsOptional()
  @IsUUID()
  parentId?: string;

  @IsOptional()
  @IsInt()
  order?: number; // defaults to end-of-siblings if omitted
}
