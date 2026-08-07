import { IsOptional, IsString } from 'class-validator';

export class SaveNoteDto {
  content: any; // TipTap JSON document

  @IsOptional()
  @IsString()
  changeSummary?: string;
}