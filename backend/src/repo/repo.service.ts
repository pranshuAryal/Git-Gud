import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
  ConflictException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateRepositoryDto } from './dto/create-repository.dto';
import { UpdateRepositoryDto } from './dto/update-repository.dto';
import {
  ListRepositoriesQueryDto,
  RepoScope,
} from './dto/list-repositories-query.dto';
import { CreateSectionDto } from './dto/create-section.dto';
import { UpdateSectionDto } from './dto/update-section.dto';
import { SaveNoteDto } from './dto/save-note.dto';
import { UpdateProfileDto } from './dto/update-profile.dto';

const CARD_SELECT = {
  id: true,
  name: true,
  description: true,
  isPublic: true,
  updatedAt: true,
  owner: { select: { id: true, username: true } },
  forkedFrom: {
    select: { id: true, name: true, owner: { select: { username: true } } },
  },
  _count: { select: { stars: true, forksMade: true, sections: true } },
};

interface SectionInput {
  title: string;
  order: number;
  note?: { content: any; originNoteId?: string | null };
  children?: SectionInput[];
}

@Injectable()
export class RepoService {
  constructor(private readonly prisma: PrismaService) {}

  // ================= REPOSITORY =================

  async createRepository(
    ownerId: string,
    dto: CreateRepositoryDto,
    forkedFromId?: string,
  ) {
    const existing = await this.prisma.repository.findUnique({
      where: { ownerId_name: { ownerId, name: dto.name } },
    });
    if (existing) {
      throw new ConflictException(
        'You already have a repository with this name',
      );
    }

    return this.prisma.$transaction(async (tx) => {
      const repo = await tx.repository.create({
        data: {
          ownerId,
          name: dto.name,
          description: dto.description,
          isPublic: dto.isPublic ?? true,
          forkedFromId: forkedFromId ?? null,
        },
      });

      const createdNotes: { noteId: string; content: any }[] = [];

      const createSectionTree = async (
        sections: SectionInput[] | undefined,
        parentId: string | null,
      ) => {
        if (!sections) return;
        for (const s of sections) {
          const section = await tx.section.create({
            data: { repoId: repo.id, parentId, title: s.title, order: s.order },
          });

          if (s.note) {
            const note = await tx.note.create({
              data: {
                sectionId: section.id,
                content: s.note.content,
                originNoteId: s.note.originNoteId ?? null,
              },
            });
            createdNotes.push({ noteId: note.id, content: s.note.content });
          }

          await createSectionTree(s.children, section.id);
        }
      };

      await createSectionTree(dto.sections, null);

      return { repo, createdNotes };
    });
  }

  async findRepositories(userId: string, query: ListRepositoriesQueryDto) {
    const { scope, search, page = 1, limit = 20 } = query;
    const where: Record<string, unknown> = {};

    switch (scope) {
      case RepoScope.OWNED:
        where.ownerId = userId;
        where.forkedFromId = null;
        break;
      case RepoScope.FORKED:
        where.ownerId = userId;
        where.forkedFromId = { not: null };
        break;
      case RepoScope.DISCOVER:
        where.isPublic = true;
        break;
      case RepoScope.STARRED:
        where.stars = { some: { userId } };
        break;
    }

    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { description: { contains: search, mode: 'insensitive' } },
      ];
    }

    const [items, total] = await this.prisma.$transaction([
      this.prisma.repository.findMany({
        where,
        select: CARD_SELECT,
        orderBy: { updatedAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.prisma.repository.count({ where }),
    ]);

    return { items, total, page, limit, hasMore: page * limit < total };
  }

  async findRepository(userId: string, id: string) {
    const repo = await this.prisma.repository.findUnique({
      where: { id },
      include: {
        owner: { select: { id: true, username: true } },
        forkedFrom: {
          select: {
            id: true,
            name: true,
            owner: { select: { username: true } },
          },
        },
        sections: { include: { note: true }, orderBy: { order: 'asc' } },
        _count: { select: { stars: true, forksMade: true, sections: true } },
      },
    });

    if (!repo) throw new NotFoundException('Repository not found');
    if (!repo.isPublic && repo.ownerId !== userId) {
      throw new ForbiddenException('This repository is private');
    }

    return { ...repo, editable: repo.ownerId === userId };
  }

  async updateRepository(userId: string, id: string, dto: UpdateRepositoryDto) {
    const repo = await this.assertOwnership(userId, id);
    return this.prisma.repository.update({ where: { id: repo.id }, data: dto });
  }

  async deleteRepository(userId: string, id: string) {
    const repo = await this.assertOwnership(userId, id);
    await this.prisma.repository.delete({ where: { id: repo.id } });
    return { success: true };
  }

  async forkRepository(userId: string, repoId: string) {
    const original = await this.prisma.repository.findUnique({
      where: { id: repoId },
      include: { sections: { include: { note: true } } },
    });

    if (!original) throw new NotFoundException('Repository not found');
    if (!original.isPublic) {
      throw new ForbiddenException('Only public repositories can be forked');
    }
    if (original.ownerId === userId) {
      throw new BadRequestException('You cannot fork your own repository');
    }

    const name = await this.resolveForkName(userId, original.name);
    const sectionTree = this.buildSectionTree(original.sections);

    const { repo, createdNotes } = await this.createRepository(
      userId,
      {
        name,
        description: original.description ?? undefined,
        isPublic: original.isPublic,
        sections: sectionTree,
      },
      original.id,
    );

    await this.prisma.$transaction([
      ...createdNotes.map((n) =>
        this.prisma.version.create({
          data: {
            noteId: n.noteId,
            editedBy: userId,
            content: n.content,
            changeSummary: `Forked from "${original.name}"`,
          },
        }),
      ),
      this.prisma.fork.create({
        data: {
          originalRepoId: original.id,
          forkedRepoId: repo.id,
          forkedBy: userId,
        },
      }),
    ]);

    return repo;
  }

  // ================= SECTIONS =================

  async addSection(userId: string, repoId: string, dto: CreateSectionDto) {
    await this.assertOwnership(userId, repoId);

    if (dto.parentId) {
      const parent = await this.prisma.section.findFirst({
        where: { id: dto.parentId, repoId },
        include: { note: true },
      });
      if (!parent)
        throw new NotFoundException(
          'Parent section not found in this repository',
        );
      if (parent.note) {
        throw new ConflictException(
          'This section already has a note attached and cannot contain sub-sections',
        );
      }
    }

    const order =
      dto.order ??
      (await this.prisma.section.count({
        where: { repoId, parentId: dto.parentId ?? null },
      }));

    return this.prisma.section.create({
      data: { repoId, parentId: dto.parentId ?? null, title: dto.title, order },
    });
  }

  async updateSection(
    userId: string,
    repoId: string,
    sectionId: string,
    dto: UpdateSectionDto,
  ) {
    await this.assertOwnership(userId, repoId);

    const section = await this.prisma.section.findFirst({
      where: { id: sectionId, repoId },
    });
    if (!section)
      throw new NotFoundException('Section not found in this repository');

    if (dto.parentId !== undefined && dto.parentId !== null) {
      if (dto.parentId === sectionId) {
        throw new BadRequestException('A section cannot be its own parent');
      }
      const newParent = await this.prisma.section.findFirst({
        where: { id: dto.parentId, repoId },
        include: { note: true },
      });
      if (!newParent)
        throw new NotFoundException('Target parent section not found');
      if (newParent.note) {
        throw new ConflictException(
          'Target section already has a note attached',
        );
      }
    }

    return this.prisma.section.update({
      where: { id: sectionId },
      data: {
        ...(dto.title !== undefined && { title: dto.title }),
        ...(dto.order !== undefined && { order: dto.order }),
        ...(dto.parentId !== undefined && { parentId: dto.parentId }),
      },
    });
  }

  async deleteSection(userId: string, repoId: string, sectionId: string) {
    await this.assertOwnership(userId, repoId);

    const section = await this.prisma.section.findFirst({
      where: { id: sectionId, repoId },
    });
    if (!section)
      throw new NotFoundException('Section not found in this repository');

    await this.prisma.section.delete({ where: { id: sectionId } });
    return { success: true };
  }

  // ================= NOTES =================

  async createNote(userId: string, repoId: string, sectionId: string) {
    await this.assertOwnership(userId, repoId);

    const section = await this.prisma.section.findFirst({
      where: { id: sectionId, repoId },
      include: { children: true, note: true },
    });
    if (!section)
      throw new NotFoundException('Section not found in this repository');
    if (section.children.length > 0) {
      throw new ConflictException(
        'Cannot attach a note to a section that has sub-sections',
      );
    }
    if (section.note) {
      throw new ConflictException('This section already has a note');
    }

    return this.prisma.note.create({
      data: { sectionId, content: {} },
    });
  }

  async saveNote(
    userId: string,
    repoId: string,
    noteId: string,
    dto: SaveNoteDto,
  ) {
    await this.assertOwnership(userId, repoId);

    const note = await this.prisma.note.findFirst({
      where: { id: noteId, section: { repoId } },
    });
    if (!note) throw new NotFoundException('Note not found in this repository');

    const [updatedNote] = await this.prisma.$transaction([
      this.prisma.note.update({
        where: { id: noteId },
        data: { content: dto.content },
      }),
      this.prisma.version.create({
        data: {
          noteId,
          editedBy: userId,
          content: dto.content,
          changeSummary: dto.changeSummary,
        },
      }),
    ]);

    return updatedNote;
  }

  async getNote(userId: string, repoId: string, noteId: string) {
    const repo = await this.prisma.repository.findUnique({
      where: { id: repoId },
      select: { id: true, isPublic: true, ownerId: true },
    });
    if (!repo) throw new NotFoundException('Repository not found');
    if (!repo.isPublic && repo.ownerId !== userId) {
      throw new ForbiddenException('This repository is private');
    }

    const note = await this.prisma.note.findFirst({
      where: { id: noteId, section: { repoId } },
      include: { section: { select: { id: true, title: true } } },
    });
    if (!note) throw new NotFoundException('Note not found in this repository');

    const versions = await this.prisma.version.findMany({
      where: { noteId },
      include: {
        editor: { select: { id: true, username: true } },
      },
      orderBy: { createdAt: 'desc' },
    });

    return {
      id: note.id,
      content: note.content,
      updatedAt: note.updatedAt,
      section: note.section,
      lastVersion: versions[0]
        ? { editedBy: versions[0].editor, createdAt: versions[0].createdAt }
        : null,
      versionNumber: versions.length ? 1 : 0,
      versions: versions.slice(0, 10).map((v) => ({
        id: v.id,
        changeSummary: v.changeSummary,
        createdAt: v.createdAt,
        editedBy: v.editor,
      })),
    };
  }

  async listNoteVersions(userId: string, repoId: string, noteId: string) {
    const note = await this.prisma.note.findFirst({
      where: { id: noteId, section: { repoId } },
    });
    if (!note) throw new NotFoundException('Note not found in this repository');

    return this.prisma.version.findMany({
      where: { noteId },
      include: {
        editor: { select: { id: true, username: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  // ================= STARS =================

  async starRepository(userId: string, repoId: string) {
    const repo = await this.prisma.repository.findUnique({
      where: { id: repoId },
    });
    if (!repo) throw new NotFoundException('Repository not found');

    const existing = await this.prisma.star.findUnique({
      where: { userId_repoId: { userId, repoId } },
    });
    if (existing)
      throw new ConflictException('Already starred this repository');

    await this.prisma.star.create({ data: { userId, repoId } });
    return { starred: true };
  }

  async unstarRepository(userId: string, repoId: string) {
    const existing = await this.prisma.star.findUnique({
      where: { userId_repoId: { userId, repoId } },
    });
    if (!existing) throw new NotFoundException('Star not found');

    await this.prisma.star.delete({ where: { id: existing.id } });
    return { starred: false };
  }

  async checkStarred(
    userId: string,
    repoId: string,
  ): Promise<{ starred: boolean }> {
    const existing = await this.prisma.star.findUnique({
      where: { userId_repoId: { userId, repoId } },
    });
    return { starred: !!existing };
  }

  // ================= PROFILES =================

  async getUserProfile(viewerId: string, userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        username: true,
        name: true,
        bio: true,
        createdAt: true,
      },
    });
    if (!user) throw new NotFoundException('User not found');

    const isSelf = viewerId === userId;

    const [counts, publicRepos] = await this.prisma.$transaction([
      this.prisma.user.findUnique({
        where: { id: userId },
        select: {
          _count: {
            select: {
              repositories: {
                where: {
                  forkedFromId: null,
                  ...(isSelf ? {} : { isPublic: true }),
                },
              },
              stars: isSelf ? true : { where: { repo: { isPublic: true } } },
              comments: true,
            },
          },
        },
      }),
      this.prisma.repository.findMany({
        where: {
          ownerId: userId,
          ...(isSelf ? {} : { isPublic: true }),
          forkedFromId: null,
        },
        select: CARD_SELECT,
        orderBy: { updatedAt: 'desc' },
        take: 50,
      }),
    ]);

    const [
      forksMade,
      starsReceived,
      mergeRequestsReceived,
      mergeRequestsSubmitted,
    ] = await this.prisma.$transaction([
      this.prisma.fork.count({ where: { forkedBy: userId } }),
      this.prisma.star.count({
        where: {
          repo: {
            ownerId: userId,
            ...(isSelf ? {} : { isPublic: true }),
          },
        },
      }),
      this.prisma.mergeRequest.count({ where: { repo: { ownerId: userId } } }),
      this.prisma.mergeRequest.count({ where: { submittedBy: userId } }),
    ]);

    return {
      profile: {
        id: user.id,
        username: user.username,
        name: user.name,
        bio: user.bio,
        createdAt: user.createdAt,
      },
      isSelf,
      counts: {
        repositories: counts?._count?.repositories ?? 0,
        forksMade,
        starsReceived,
        mergeRequestsReceived,
        mergeRequestsSubmitted,
      },
      repositories: publicRepos,
    };
  }

  async updateUserProfile(
    viewerId: string,
    userId: string,
    dto: UpdateProfileDto,
  ) {
    if (viewerId !== userId) {
      throw new ForbiddenException('You can only update your own profile');
    }

    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });
    if (!user) throw new NotFoundException('User not found');

    if (dto.username && dto.username !== user.username) {
      const existing = await this.prisma.user.findFirst({
        where: { username: dto.username },
      });
      if (existing) {
        throw new ConflictException(
          'An account with this username already exists',
        );
      }
    }

    const updated = await this.prisma.user.update({
      where: { id: userId },
      data: {
        ...(dto.username !== undefined && { username: dto.username }),
        ...(dto.name !== undefined && { name: dto.name }),
        ...(dto.bio !== undefined && { bio: dto.bio }),
      },
      select: {
        id: true,
        username: true,
        name: true,
        bio: true,
        email: true,
        createdAt: true,
      },
    });

    return { profile: updated };
  }

  // ================= PRIVATE HELPERS =================

  private async assertOwnership(userId: string, repoId: string) {
    const repo = await this.prisma.repository.findUnique({
      where: { id: repoId },
    });
    if (!repo) throw new NotFoundException('Repository not found');
    if (repo.ownerId !== userId)
      throw new ForbiddenException('Not your repository');
    return repo;
  }

  private buildSectionTree(
    flat: {
      id: string;
      parentId: string | null;
      title: string;
      order: number;
      note: { id: string; content: any } | null;
    }[],
  ): SectionInput[] {
    const byParent = new Map<string | null, typeof flat>();
    for (const s of flat) {
      const list = byParent.get(s.parentId) ?? [];
      list.push(s);
      byParent.set(s.parentId, list);
    }

    const build = (parentId: string | null): SectionInput[] =>
      (byParent.get(parentId) ?? []).map((s) => ({
        title: s.title,
        order: s.order,
        note: s.note
          ? { content: s.note.content, originNoteId: s.note.id }
          : undefined,
        children: build(s.id),
      }));

    return build(null);
  }

  private async resolveForkName(
    userId: string,
    baseName: string,
  ): Promise<string> {
    const existing = await this.prisma.repository.findUnique({
      where: { ownerId_name: { ownerId: userId, name: baseName } },
    });
    if (!existing) return baseName;

    let suffix = 2;
    let candidate = `${baseName} (fork)`;
    while (
      await this.prisma.repository.findUnique({
        where: { ownerId_name: { ownerId: userId, name: candidate } },
      })
    ) {
      candidate = `${baseName} (fork ${suffix})`;
      suffix++;
    }
    return candidate;
  }
}
