-- CreateEnum
CREATE TYPE "AccessMode" AS ENUM ('INVITE_ONLY', 'EVENT_CODE', 'BOTH');

-- AlterTable
ALTER TABLE "Event" ADD COLUMN "accessMode" "AccessMode" NOT NULL DEFAULT 'INVITE_ONLY';
ALTER TABLE "Event" ADD COLUMN "eventCode" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "Event_eventCode_key" ON "Event"("eventCode");

-- AlterTable
ALTER TABLE "Invitation" DROP COLUMN "side";
ALTER TABLE "Invitation" DROP COLUMN "sourceId";

-- RenameTable
ALTER TABLE "InvitedGuest" RENAME TO "InvitationMember";

-- CreateIndex
CREATE INDEX "Invitation_eventId_idx" ON "Invitation"("eventId");
CREATE INDEX "Post_eventId_idx" ON "Post"("eventId");
CREATE INDEX "Media_eventId_idx" ON "Media"("eventId");
CREATE INDEX "Media_postId_idx" ON "Media"("postId");
CREATE INDEX "Reaction_postId_idx" ON "Reaction"("postId");
CREATE INDEX "Comment_postId_idx" ON "Comment"("postId");
