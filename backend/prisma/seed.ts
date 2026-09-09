import * as fs from 'fs';
import * as path from 'path';
import * as bcrypt from 'bcryptjs';
import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';

const SALT_ROUNDS = 10;

async function main() {
  const dataPath =
    process.argv[2] ??
    path.join(__dirname, 'seed-data.json');

  if (!fs.existsSync(dataPath)) {
    throw new Error(`Seed data file not found: ${dataPath}`);
  }

  const payload = JSON.parse(fs.readFileSync(dataPath, 'utf8'));

  const prisma = new PrismaClient({
    adapter: new PrismaPg({
      connectionString: process.env.DATABASE_URL!,
    }),
  });

  const userIds: Record<string, string> = {};
  const repoIds: Record<string, string> = {};

  // 1. Users
  console.log('Seeding users...');
  for (const u of payload.users ?? []) {
    const user = await prisma.user.create({
      data: {
        email: u.email,
        username: u.username,
        password: await bcrypt.hash(u.password, SALT_ROUNDS),
        createdAt: new Date(u.createdAt ?? Date.now()),
      },
    });
    userIds[u.username] = user.id;
  }

  // 2. Repositories, sections, notes, versions
  console.log('Seeding repositories...');
  for (const r of payload.repositories ?? []) {
    const ownerId = userIds[r.owner];
    if (!ownerId) throw new Error(`Unknown owner ${r.owner} for repo ${r.name}`);

    const repo = await prisma.repository.create({
      data: {
        ownerId,
        name: r.name,
        description: r.description ?? null,
        isPublic: r.isPublic ?? true,
        createdAt: new Date(r.createdAt ?? Date.now()),
        updatedAt: new Date(r.createdAt ?? Date.now()),
      },
    });
    const repoKey = `${r.owner}/${r.name}`;
    repoIds[repoKey] = repo.id;

    // Sections tree -> path key => sectionId
    const sectionIds: Record<string, string> = {};

    async function createSection(
      node: any,
      parentId: string | null,
      order: number,
      ancestors: string[],
    ): Promise<void> {
      const created = await prisma.section.create({
        data: {
          repoId: repo.id,
          parentId,
          title: node.title,
          order: node.order ?? order,
          createdAt: new Date(node.createdAt ?? Date.now()),
        },
      });
      const nodeKey = [...ancestors, node.title].join('/');
      sectionIds[nodeKey] = created.id;
      for (const [i, child] of (node.children ?? []).entries()) {
        await createSection(child, created.id, i, [...ancestors, node.title]);
      }
    }

    for (const [i, s] of (r.sections ?? []).entries()) {
      await createSection(s, null, i, []);
    }

    // Notes
    for (const n of r.notes ?? []) {
      const pathKey = (n.section_path ?? []).join('/');
      const sectionId = sectionIds[pathKey];
      if (!sectionId) {
        throw new Error(
          `Note section not found: ${repoKey}/${pathKey} (have sections: ${Object.keys(sectionIds).join(', ')})`,
        );
      }
      const note = await prisma.note.create({
        data: {
          sectionId,
          content: n.content as any,
          createdAt: new Date(n.createdAt ?? Date.now()),
          updatedAt: new Date(n.createdAt ?? Date.now()),
        },
      });
      for (const v of n.versions ?? []) {
        const editorId = userIds[v.editedBy];
        if (!editorId) {
          throw new Error(`Unknown version editor ${v.editedBy} for ${repoKey}/${pathKey}`);
        }
        await prisma.version.create({
          data: {
            noteId: note.id,
            editedBy: editorId,
            content: v.content as any,
            changeSummary: v.changeSummary ?? null,
            createdAt: new Date(v.createdAt ?? Date.now()),
          },
        });
      }
    }
  }

  // 3. Forks (in order; a fork repo may be referenced later)
  console.log('Seeding forks...');
  for (const f of payload.forks ?? []) {
    const originRepoKey = f.originalRepo;
    const originRepoId = repoIds[originRepoKey];
    if (!originRepoId) {
      throw new Error(`Fork origin not found: ${originRepoKey} (fork of ${f.forkName} by ${f.forkedBy})`);
    }
    const forkerId = userIds[f.forkedBy];
    if (!forkerId) throw new Error(`Unknown forker ${f.forkedBy}`);

    const originRepo = await prisma.repository.findUnique({
      where: { id: originRepoId },
      include: {
        sections: {
          include: { note: true },
        },
      },
    });
    if (!originRepo) throw new Error(`Origin repo missing: ${originRepoKey}`);

    const forkRepo = await prisma.repository.create({
      data: {
        ownerId: forkerId,
        name: f.forkName,
        description: originRepo.description,
        isPublic: originRepo.isPublic,
        forkedFromId: originRepoId,
        createdAt: new Date(f.createdAt ?? Date.now()),
        updatedAt: new Date(f.createdAt ?? Date.now()),
      },
    });
    repoIds[`${f.forkedBy}/${f.forkName}`] = forkRepo.id;

    const originSections = originRepo.sections;
    const parentMap: Record<string, string> = {};

    async function cloneSection(
      section: any,
      newParentId: string | null,
      order: number,
    ): Promise<string> {
      const copy = await prisma.section.create({
        data: {
          repoId: forkRepo.id,
          parentId: newParentId,
          title: section.title,
          order: section.order ?? order,
          createdAt: section.createdAt,
        },
      });
      parentMap[section.id] = copy.id;
      if (section.note) {
        const noteCopy = await prisma.note.create({
          data: {
            sectionId: copy.id,
            content: section.note.content as any,
            originNoteId: section.note.id,
            createdAt: section.note.createdAt,
            updatedAt: section.note.updatedAt,
          },
        });
        await prisma.version.create({
          data: {
            noteId: noteCopy.id,
            editedBy: forkerId,
            content: section.note.content as any,
            changeSummary: `Forked from "${originRepo!.name}"`,
            createdAt: new Date(f.createdAt ?? Date.now()),
          },
        });
      }
      for (const child of section.children ?? []) {
        await cloneSection(child, copy.id, 0);
      }
      return copy.id;
    }

    // clone roots first (parents referenced before children)
    const roots = originSections
      .filter((s: any) => s.parentId === null)
      .sort((a: any, b: any) => a.order - b.order);
    for (const root of roots) {
      await cloneSection(root, null, root.order);
    }
    // children not yet referenced by these roots already handled; ensure remaining
    const nonRoots = originSections
      .filter((s: any) => s.parentId !== null)
      .sort((a: any, b: any) => a.order - b.order);
    for (const s of nonRoots) {
      if (!parentMap[s.id]) {
        const p = s.parentId ? parentMap[s.parentId] ?? null : null;
        await cloneSection(s, p, s.order);
      }
    }

    await prisma.fork.create({
      data: {
        originalRepoId: originRepoId,
        forkedRepoId: forkRepo.id,
        forkedBy: forkerId,
        createdAt: new Date(f.createdAt ?? Date.now()),
      },
    });
  }

  // 4. Merge requests (+ comments)
  console.log('Seeding merge requests...');
  for (const m of payload.mergeRequests ?? []) {
    const repoId = repoIds[m.repo];
    if (!repoId) throw new Error(`MR repo not found: ${m.repo}`);
    const submitterId = userIds[m.submittedBy];
    if (!submitterId) throw new Error(`MR submitter not found: ${m.submittedBy}`);

    // note address: owner/repo/sec1/sec2/...
    const parts = m.note.split('/');
    const note = await findNoteByPath(prisma, repoId, parts.slice(2));
    if (!note) {
      throw new Error(`MR note not found: ${m.note}`);
    }

    const mr = await prisma.mergeRequest.create({
      data: {
        repoId,
        noteId: note.id,
        submittedBy: submitterId,
        title: m.title,
        description: m.description ?? null,
        oldContent: m.oldContent as any,
        newContent: m.newContent as any,
        status: m.status ?? 'pending',
        feedback: m.feedback ?? null,
        createdAt: new Date(m.createdAt ?? Date.now()),
      },
    });

    for (const c of m.comments ?? []) {
      const authorId = userIds[c.author];
      if (!authorId) throw new Error(`Unknown comment author ${c.author}`);
      await prisma.comment.create({
        data: {
          mergeRequestId: mr.id,
          authorId,
          content: c.content,
          createdAt: new Date(c.createdAt ?? Date.now()),
        },
      });
    }
  }

  // 5. Stars
  console.log('Seeding stars...');
  for (const s of payload.stars ?? []) {
    const userId = userIds[s.user];
    const repoId = repoIds[s.repo];
    if (!userId) throw new Error(`Unknown star user ${s.user}`);
    if (!repoId) throw new Error(`Unknown star repo ${s.repo}`);
    await prisma.star.create({
      data: {
        userId,
        repoId,
        createdAt: new Date(s.createdAt ?? Date.now()),
      },
    });
  }

  const counts = {
    users: await prisma.user.count(),
    repositories: await prisma.repository.count(),
    sections: await prisma.section.count(),
    notes: await prisma.note.count(),
    versions: await prisma.version.count(),
    forks: await prisma.fork.count(),
    mergeRequests: await prisma.mergeRequest.count(),
    comments: await prisma.comment.count(),
    stars: await prisma.star.count(),
  };
  console.log('Seeding complete:', JSON.stringify(counts, null, 2));

  await prisma.$disconnect();
}

async function findNoteByPath(
  prisma: PrismaClient,
  repoId: string,
  path: string[],
): Promise<{ id: string } | null> {
  let parentId: string | null = null;
  let section: any = null;
  for (const [i, title] of path.entries()) {
    section = await prisma.section.findFirst({
      where: i === 0 ? { repoId, parentId: null, title } : { repoId, parentId, title },
      include: { note: true },
    });
    if (!section) return null;
    parentId = section.id;
    if (i === path.length - 1) {
      return section.note ? { id: section.note.id } : null;
    }
  }
  return null;
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});