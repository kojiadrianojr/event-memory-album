-- AlterTable
ALTER TABLE "Event" ADD COLUMN "adminTokenLookup" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "Event_adminTokenLookup_key" ON "Event"("adminTokenLookup");
