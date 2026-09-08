import { IsObject, IsOptional, IsString } from 'class-validator';

export class SaveNoteDto {
  @IsObject()
  content: any; // TipTap JSON document

  @IsOptional()
  @IsString()
  changeSummary?: string;
}
