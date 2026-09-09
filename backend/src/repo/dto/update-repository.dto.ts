import { PartialType, OmitType } from '@nestjs/mapped-types';
import { CreateRepositoryDto } from './create-repository.dto';

export class UpdateRepositoryDto extends PartialType(
  OmitType(CreateRepositoryDto, ['sections'] as const),
) {}
