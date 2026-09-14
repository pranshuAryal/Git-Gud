import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateMergeRequestDto } from './dto/create-mr.dto';
import { MergeRequestStatus, UpdateMergeRequestDto } from './dto/update-mr.dto';
import { CreateCommentDto } from './dto/create-comment.dto';
import { computeFlatDiff } from '../repo/diff.util';
import type { Prisma } from '@prisma/client';

const MR_INCLUDE = {
  submitter: { select: { id: true, username: true } },
  repo: {
    select: {
      id: true,
      name: true,
      ownerId: true,
      owner: { select: { id: true, username: true } },
    },
  },
  note: {
    select: { id: true, section: { select: { id: true, title: true } } },
  },
  comments: {
    include: { author: { select: { id: true, username: true } } },
    orderBy: { createdAt: 'asc' },
  },
} as const;

@Injectable()
export class MergeRequestService {
  constructor(private readonly prisma: PrismaService) {}

  async createMergeRequest(userId: string, dto: CreateMergeRequestDto) {
    const repo = await this.prisma.repository.findUnique({
      where: { id: dto.repoId },
      include: { forkedFrom: { select: { id: true, name: true } } },
    });
    if (!repo) throw new NotFoundException('Repository not found');

    const note = await this.prisma.note.findFirst({
      where: { id: dto.noteId, section: { repoId: dto.repoId } },
    });
    if (!note) throw new NotFoundException('Note not found in this repository');

    let targetRepoId = repo.id;
    let targetRepoName = repo.name;
    let targetNote: { id: string; content: unknown } = {
      id: note.id,
      content: note.content,
    };

    if (repo.ownerId === userId) {
      if (!repo.forkedFrom) {
        throw new BadRequestException(
          'You cannot create a merge request on your own repository',
        );
      }
      const originNote = await this.prisma.note.findUnique({
        where: { id: note.originNoteId ?? undefined },
      });
      if (!originNote) {
        throw new NotFoundException('Origin note not found for this fork');
      }
      targetRepoId = repo.forkedFrom.id;
      targetRepoName = repo.forkedFrom.name;
      targetNote = { id: originNote.id, content: originNote.content };
    }

    const mr = await this.prisma.mergeRequest.create({
      data: {
        repoId: targetRepoId,
        noteId: targetNote.id,
        submittedBy: userId,
        title: dto.title,
        description: dto.description,
        oldContent: targetNote.content as Prisma.InputJsonValue,
        newContent: dto.content as Prisma.InputJsonValue,
      },
      select: { id: true },
    });

    return { id: mr.id, repo: { id: targetRepoId, name: targetRepoName } };
  }

  async listMergeRequests(
    userId: string,
    query: {
      repoId?: string;
      status?: string;
      scope?: 'submitted' | 'received';
    },
  ) {
    const where: Record<string, unknown> = {};

    if (query.scope) {
      Object.assign(
        where,
        query.scope === 'submitted'
          ? { submittedBy: userId }
          : { repo: { ownerId: userId } },
      );
    }

    if (query.repoId) {
      const repo = await this.prisma.repository.findUnique({
        where: { id: query.repoId },
        select: { isPublic: true, ownerId: true },
      });
      if (!repo) throw new NotFoundException('Repository not found');
      if (!repo.isPublic && repo.ownerId !== userId) {
        throw new ForbiddenException('This repository is private');
      }
      where.repoId = query.repoId;
    }

    if (query.status) {
      where.status = query.status;
    }

    return this.prisma.mergeRequest.findMany({
      where,
      include: MR_INCLUDE,
      orderBy: { createdAt: 'desc' },
    });
  }

  async findMergeRequest(userId: string, mrId: string) {
    const mr = await this.prisma.mergeRequest.findUnique({
      where: { id: mrId },
      include: {
        ...MR_INCLUDE,
        repo: {
          select: {
            id: true,
            name: true,
            ownerId: true,
            owner: { select: { id: true, username: true } },
            isPublic: true,
          },
        },
      },
    });
    if (!mr) throw new NotFoundException('Merge request not found');

    this.assertCanAccess(userId, mr);

    const { oldContent, newContent, ...rest } = mr;
    return {
      ...rest,
      diff: computeFlatDiff(oldContent, newContent),
    };
  }

  async updateMergeRequest(
    userId: string,
    mrId: string,
    dto: UpdateMergeRequestDto,
  ) {
    const mr = await this.prisma.mergeRequest.findUnique({
      where: { id: mrId },
      include: {
        repo: { select: { ownerId: true } },
        note: { select: { id: true } },
      },
    });
    if (!mr) throw new NotFoundException('Merge request not found');
    if (mr.repo.ownerId !== userId) {
      throw new ForbiddenException(
        'Only the repository owner can update this merge request',
      );
    }
    if (mr.status !== 'pending') {
      throw new BadRequestException(
        'This merge request has already been resolved',
      );
    }

    if (dto.status === MergeRequestStatus.APPROVED) {
      const content = mr.newContent as Prisma.InputJsonValue;
      await this.prisma.$transaction([
        this.prisma.note.update({
          where: { id: mr.note.id },
          data: { content },
        }),
        this.prisma.version.create({
          data: {
            noteId: mr.note.id,
            editedBy: mr.submittedBy,
            content,
            changeSummary: `Approved merge request: ${mr.title}`,
          },
        }),
      ]);
    }

    return this.prisma.mergeRequest.update({
      where: { id: mrId },
      data: {
        status: dto.status,
        ...(dto.feedback !== undefined && { feedback: dto.feedback }),
      },
    });
  }

  async cancelMergeRequest(userId: string, mrId: string) {
    const mr = await this.prisma.mergeRequest.findUnique({
      where: { id: mrId },
      select: { id: true, submittedBy: true, status: true },
    });
    if (!mr) throw new NotFoundException('Merge request not found');
    if (mr.submittedBy !== userId) {
      throw new ForbiddenException(
        'Only the submitter can cancel this merge request',
      );
    }
    if (mr.status !== 'pending') {
      throw new BadRequestException(
        'This merge request has already been resolved',
      );
    }

    return this.prisma.mergeRequest.update({
      where: { id: mrId },
      data: { status: MergeRequestStatus.CANCELLED },
      include: MR_INCLUDE,
    });
  }

  async addComment(userId: string, mrId: string, dto: CreateCommentDto) {
    const mr = await this.prisma.mergeRequest.findUnique({
      where: { id: mrId },
      include: {
        repo: { select: { ownerId: true, isPublic: true } },
      },
    });
    if (!mr) throw new NotFoundException('Merge request not found');

    this.assertCanAccess(userId, mr);

    return this.prisma.comment.create({
      data: { mergeRequestId: mrId, authorId: userId, content: dto.content },
      include: { author: { select: { id: true, username: true } } },
    });
  }

  private assertCanAccess(
    userId: string,
    mr: { submittedBy: string; repo: { ownerId: string; isPublic: boolean } },
  ) {
    const isOwner = mr.repo.ownerId === userId;
    const isSubmitter = mr.submittedBy === userId;
    if (!isOwner && !isSubmitter && !mr.repo.isPublic) {
      throw new ForbiddenException('Not allowed to view this merge request');
    }
  }
}
