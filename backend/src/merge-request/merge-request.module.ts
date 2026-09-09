import { Module } from '@nestjs/common';
import { MergeRequestController } from './merge-request.controller';
import { MergeRequestService } from './merge-request.service';

@Module({
  controllers: [MergeRequestController],
  providers: [MergeRequestService],
})
export class MergeRequestModule {}
