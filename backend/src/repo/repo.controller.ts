import {
  Body,
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Param,
  Query,
  UseGuards,
  HttpCode,
} from '@nestjs/common';
import { RepoService } from './repo.service';
import { CreateRepositoryDto } from './dto/create-repository.dto';
import { UpdateRepositoryDto } from './dto/update-repository.dto';
import { ListRepositoriesQueryDto } from './dto/list-repositories-query.dto';
import { CreateSectionDto } from './dto/create-section.dto';
import { UpdateSectionDto } from './dto/update-section.dto';
import { SaveNoteDto } from './dto/save-note.dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { CurrentUser } from 'src/common/decorators/current-user.decorator';

@Controller('repositories')
@UseGuards(JwtAuthGuard)
export class RepoController {
  constructor(private readonly repoService: RepoService) {}

  // ---------- repository ----------

  @Post()
  create(
    @Body() dto: CreateRepositoryDto,
    @CurrentUser() user: { userId: string },
  ) {
    return this.repoService.createRepository(user.userId, dto);
  }

  @Get()
  findRepositories(
    @Query() query: ListRepositoriesQueryDto,
    @CurrentUser() user: { userId: string },
  ) {
    return this.repoService.findRepositories(user.userId, query);
  }

  @Get(':id')
  findOne(@Param('id') id: string, @CurrentUser() user: { userId: string }) {
    return this.repoService.findRepository(user.userId, id);
  }

  @Patch(':id')
  update(
    @Param('id') id: string,
    @Body() dto: UpdateRepositoryDto,
    @CurrentUser() user: { userId: string },
  ) {
    return this.repoService.updateRepository(user.userId, id, dto);
  }

  @Delete(':id')
  remove(@Param('id') id: string, @CurrentUser() user: { userId: string }) {
    return this.repoService.deleteRepository(user.userId, id);
  }

  @Post(':id/fork')
  fork(@Param('id') id: string, @CurrentUser() user: { userId: string }) {
    return this.repoService.forkRepository(user.userId, id);
  }

  // ---------- stars ----------

  @Post(':id/star')
  @HttpCode(201)
  star(@Param('id') repoId: string, @CurrentUser() user: { userId: string }) {
    return this.repoService.starRepository(user.userId, repoId);
  }

  @Delete(':id/star')
  @HttpCode(200)
  unstar(@Param('id') repoId: string, @CurrentUser() user: { userId: string }) {
    return this.repoService.unstarRepository(user.userId, repoId);
  }

  @Get(':id/starred')
  checkStarred(
    @Param('id') repoId: string,
    @CurrentUser() user: { userId: string },
  ) {
    return this.repoService.checkStarred(user.userId, repoId);
  }

  // ---------- sections ----------

  @Post(':id/sections')
  addSection(
    @Param('id') repoId: string,
    @Body() dto: CreateSectionDto,
    @CurrentUser() user: { userId: string },
  ) {
    return this.repoService.addSection(user.userId, repoId, dto);
  }

  @Patch(':id/sections/:sectionId')
  updateSection(
    @Param('id') repoId: string,
    @Param('sectionId') sectionId: string,
    @Body() dto: UpdateSectionDto,
    @CurrentUser() user: { userId: string },
  ) {
    return this.repoService.updateSection(user.userId, repoId, sectionId, dto);
  }

  @Delete(':id/sections/:sectionId')
  deleteSection(
    @Param('id') repoId: string,
    @Param('sectionId') sectionId: string,
    @CurrentUser() user: { userId: string },
  ) {
    return this.repoService.deleteSection(user.userId, repoId, sectionId);
  }

  // ---------- notes ----------

  @Post(':id/sections/:sectionId/note')
  createNote(
    @Param('id') repoId: string,
    @Param('sectionId') sectionId: string,
    @CurrentUser() user: { userId: string },
  ) {
    return this.repoService.createNote(user.userId, repoId, sectionId);
  }

  @Patch(':id/notes/:noteId')
  saveNote(
    @Param('id') repoId: string,
    @Param('noteId') noteId: string,
    @Body() dto: SaveNoteDto,
    @CurrentUser() user: { userId: string },
  ) {
    return this.repoService.saveNote(user.userId, repoId, noteId, dto);
  }

  @Get(':id/notes/:noteId')
  getNote(
    @Param('id') repoId: string,
    @Param('noteId') noteId: string,
    @CurrentUser() user: { userId: string },
  ) {
    return this.repoService.getNote(user.userId, repoId, noteId);
  }

  @Get(':id/notes/:noteId/versions')
  noteVersions(
    @Param('id') repoId: string,
    @Param('noteId') noteId: string,
    @CurrentUser() user: { userId: string },
  ) {
    return this.repoService.listNoteVersions(user.userId, repoId, noteId);
  }
}
