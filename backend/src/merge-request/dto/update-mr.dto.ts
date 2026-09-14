import { IsEnum, IsOptional, IsString } from 'class-validator';

export enum MergeRequestStatus {
  APPROVED = 'approved',
  REJECTED = 'rejected',
  CANCELLED = 'cancelled',
}

export class UpdateMergeRequestDto {
  @IsEnum(MergeRequestStatus)
  status: MergeRequestStatus;

  @IsOptional()
  @IsString()
  feedback?: string;
}
