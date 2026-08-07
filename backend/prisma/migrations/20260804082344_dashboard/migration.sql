-- CreateTable
CREATE TABLE "repository" (
    "id" TEXT NOT NULL,
    "ownerId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "isPublic" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "forkedFromId" TEXT,

    CONSTRAINT "repository_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "section" (
    "id" TEXT NOT NULL,
    "repoId" TEXT NOT NULL,
    "parentId" TEXT,
    "title" TEXT NOT NULL,
    "order" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "section_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "note" (
    "id" TEXT NOT NULL,
    "sectionId" TEXT NOT NULL,
    "content" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "note_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "version" (
    "id" TEXT NOT NULL,
    "noteId" TEXT NOT NULL,
    "editedBy" TEXT NOT NULL,
    "content" JSONB NOT NULL,
    "changeSummary" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "version_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "fork" (
    "id" TEXT NOT NULL,
    "originalRepoId" TEXT NOT NULL,
    "forkedRepoId" TEXT NOT NULL,
    "forkedBy" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "fork_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "merge_request" (
    "id" TEXT NOT NULL,
    "repoId" TEXT NOT NULL,
    "noteId" TEXT NOT NULL,
    "submittedBy" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "oldContent" JSONB NOT NULL,
    "newContent" JSONB NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "feedback" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "merge_request_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "star" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "repoId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "star_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "comment" (
    "id" TEXT NOT NULL,
    "mergeRequestId" TEXT NOT NULL,
    "authorId" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "comment_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "repository_ownerId_name_key" ON "repository"("ownerId", "name");

-- CreateIndex
CREATE INDEX "section_repoId_idx" ON "section"("repoId");

-- CreateIndex
CREATE INDEX "section_parentId_idx" ON "section"("parentId");

-- CreateIndex
CREATE UNIQUE INDEX "note_sectionId_key" ON "note"("sectionId");

-- CreateIndex
CREATE INDEX "version_noteId_idx" ON "version"("noteId");

-- CreateIndex
CREATE UNIQUE INDEX "fork_forkedRepoId_key" ON "fork"("forkedRepoId");

-- CreateIndex
CREATE INDEX "fork_originalRepoId_idx" ON "fork"("originalRepoId");

-- CreateIndex
CREATE INDEX "merge_request_repoId_idx" ON "merge_request"("repoId");

-- CreateIndex
CREATE INDEX "merge_request_status_idx" ON "merge_request"("status");

-- CreateIndex
CREATE UNIQUE INDEX "star_userId_repoId_key" ON "star"("userId", "repoId");

-- CreateIndex
CREATE INDEX "comment_mergeRequestId_idx" ON "comment"("mergeRequestId");

-- AddForeignKey
ALTER TABLE "repository" ADD CONSTRAINT "repository_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "repository" ADD CONSTRAINT "repository_forkedFromId_fkey" FOREIGN KEY ("forkedFromId") REFERENCES "repository"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "section" ADD CONSTRAINT "section_repoId_fkey" FOREIGN KEY ("repoId") REFERENCES "repository"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "section" ADD CONSTRAINT "section_parentId_fkey" FOREIGN KEY ("parentId") REFERENCES "section"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "note" ADD CONSTRAINT "note_sectionId_fkey" FOREIGN KEY ("sectionId") REFERENCES "section"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "version" ADD CONSTRAINT "version_noteId_fkey" FOREIGN KEY ("noteId") REFERENCES "note"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "version" ADD CONSTRAINT "version_editedBy_fkey" FOREIGN KEY ("editedBy") REFERENCES "user"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "fork" ADD CONSTRAINT "fork_originalRepoId_fkey" FOREIGN KEY ("originalRepoId") REFERENCES "repository"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "fork" ADD CONSTRAINT "fork_forkedRepoId_fkey" FOREIGN KEY ("forkedRepoId") REFERENCES "repository"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "fork" ADD CONSTRAINT "fork_forkedBy_fkey" FOREIGN KEY ("forkedBy") REFERENCES "user"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "merge_request" ADD CONSTRAINT "merge_request_repoId_fkey" FOREIGN KEY ("repoId") REFERENCES "repository"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "merge_request" ADD CONSTRAINT "merge_request_noteId_fkey" FOREIGN KEY ("noteId") REFERENCES "note"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "merge_request" ADD CONSTRAINT "merge_request_submittedBy_fkey" FOREIGN KEY ("submittedBy") REFERENCES "user"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "star" ADD CONSTRAINT "star_userId_fkey" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "star" ADD CONSTRAINT "star_repoId_fkey" FOREIGN KEY ("repoId") REFERENCES "repository"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "comment" ADD CONSTRAINT "comment_mergeRequestId_fkey" FOREIGN KEY ("mergeRequestId") REFERENCES "merge_request"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "comment" ADD CONSTRAINT "comment_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "user"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
