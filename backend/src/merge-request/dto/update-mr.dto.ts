import { IsEnum, IsOptional, IsString } from 'class-validator';

export enum MergeRequestStatus {
  APPROVED = 'approved',
  REJECTED = 'rejected',
}

export class UpdateMergeRequestDto {
  @IsEnum(MergeRequestStatus)
  status: MergeRequestStatus;

  @IsOptional()
  @IsString()
  feedback?: string;
}
