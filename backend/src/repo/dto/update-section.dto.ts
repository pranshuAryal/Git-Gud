import { IsString, IsOptional, IsInt, IsUUID, MinLength, ValidateIf } from 'class-validator';

export class UpdateSectionDto {
  @IsOptional()
  @IsString()
  @MinLength(1)
  title?: string;

  @IsOptional()
  @IsInt()
  order?: number;

  // Allows moving to top-level (null) or to another section (uuid).
  // Omit the field entirely to leave parentId unchanged.
  @IsOptional()
  @ValidateIf((o) => o.parentId !== null)
  @IsUUID()
  parentId?: string | null;
}