-- AlterTable
ALTER TABLE "note" ADD COLUMN "originNoteId" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "note_originNoteId_key" ON "note"("originNoteId");

-- CreateIndex
CREATE INDEX "note_originNoteId_idx" ON "note"("originNoteId");

-- AddForeignKey
ALTER TABLE "note" ADD CONSTRAINT "note_originNoteId_fkey" FOREIGN KEY ("originNoteId") REFERENCES "note"("id") ON DELETE SET NULL ON UPDATE CASCADE;
