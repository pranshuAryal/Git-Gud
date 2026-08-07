import { IsEnum, IsOptional, IsString, IsInt, Min, Max } from 'class-validator';
import { Type } from 'class-transformer';

export enum RepoScope {
  OWNED = 'owned',
  FORKED = 'forked',
  DISCOVER = 'discover',
}

export class ListRepositoriesQueryDto {
  @IsEnum(RepoScope)
  scope: RepoScope;

  @IsOptional()
  @IsString()
  search?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number = 1;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(50)
  limit?: number = 20;
}