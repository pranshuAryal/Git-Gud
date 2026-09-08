import {
  IsString,
  IsOptional,
  IsBoolean,
  IsInt,
  IsArray,
  IsObject,
  ValidateNested,
  MinLength,
} from 'class-validator';
import { Type } from 'class-transformer';

class NoteInputDto {
  @IsObject()
  content: any;
}

class SectionInputDto {
  @IsString()
  @MinLength(1)
  title: string;

  @IsInt()
  order: number;

  @IsOptional()
  @ValidateNested()
  @Type(() => NoteInputDto)
  note?: NoteInputDto;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => SectionInputDto)
  children?: SectionInputDto[];
}

export class CreateRepositoryDto {
  @IsString()
  @MinLength(1)
  name: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsBoolean()
  isPublic?: boolean;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => SectionInputDto)
  sections?: SectionInputDto[];
}
