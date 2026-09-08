import {
  Body,
  Controller,
  Get,
  Patch,
  Post,
  Param,
  Query,
  UseGuards,
  HttpCode,
} from '@nestjs/common';
import { MergeRequestService } from './merge-request.service';
import { CreateMergeRequestDto } from './dto/create-mr.dto';
import { UpdateMergeRequestDto } from './dto/update-mr.dto';
import { CreateCommentDto } from './dto/create-comment.dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { CurrentUser } from 'src/common/decorators/current-user.decorator';

@Controller('merge-requests')
@UseGuards(JwtAuthGuard)
export class MergeRequestController {
  constructor(private readonly mergeRequestService: MergeRequestService) {}

  @Post()
  @HttpCode(201)
  create(
    @Body() dto: CreateMergeRequestDto,
    @CurrentUser() user: { userId: string },
  ) {
    return this.mergeRequestService.createMergeRequest(user.userId, dto);
  }

  @Get()
  findAll(
    @CurrentUser() user: { userId: string },
    @Query('repoId') repoId?: string,
    @Query('status') status?: string,
    @Query('scope') scope?: 'submitted' | 'received',
  ) {
    return this.mergeRequestService.listMergeRequests(user.userId, {
      repoId,
      status,
      scope,
    });
  }

  @Get(':id')
  findOne(@Param('id') id: string, @CurrentUser() user: { userId: string }) {
    return this.mergeRequestService.findMergeRequest(user.userId, id);
  }

  @Patch(':id')
  updateStatus(
    @Param('id') id: string,
    @Body() dto: UpdateMergeRequestDto,
    @CurrentUser() user: { userId: string },
  ) {
    return this.mergeRequestService.updateMergeRequest(user.userId, id, dto);
  }

  @Post(':id/comments')
  @HttpCode(201)
  comment(
    @Param('id') id: string,
    @Body() dto: CreateCommentDto,
    @CurrentUser() user: { userId: string },
  ) {
    return this.mergeRequestService.addComment(user.userId, id, dto);
  }
}
