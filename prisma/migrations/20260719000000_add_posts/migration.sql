-- CreateTable
CREATE TABLE "Post" (
    "id" TEXT NOT NULL,
    "eventId" TEXT NOT NULL,
    "caption" TEXT,
    "uploaderName" TEXT NOT NULL,
    "takenAt" TIMESTAMP(3),
    "uploadedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "momentId" TEXT,
    "promptId" TEXT,

    CONSTRAINT "Post_pkey" PRIMARY KEY ("id")
);

-- Backfill Post from existing Media (1:1)
INSERT INTO "Post" ("id", "eventId", "caption", "uploaderName", "takenAt", "uploadedAt", "momentId", "promptId")
SELECT
    'post_' || "id",
    "eventId",
    "caption",
    "uploaderName",
    "takenAt",
    "uploadedAt",
    "momentId",
    "promptId"
FROM "Media";

-- Add postId and sortOrder to Media
ALTER TABLE "Media" ADD COLUMN "postId" TEXT;
ALTER TABLE "Media" ADD COLUMN "sortOrder" INTEGER NOT NULL DEFAULT 0;

UPDATE "Media" SET "postId" = 'post_' || "id";

ALTER TABLE "Media" ALTER COLUMN "postId" SET NOT NULL;

-- Drop old Media columns moved to Post
ALTER TABLE "Media" DROP COLUMN "caption";
ALTER TABLE "Media" DROP COLUMN "uploaderName";
ALTER TABLE "Media" DROP COLUMN "takenAt";
ALTER TABLE "Media" DROP COLUMN "uploadedAt";
ALTER TABLE "Media" DROP COLUMN "momentId";
ALTER TABLE "Media" DROP COLUMN "promptId";

-- Migrate Reaction from mediaId to postId
ALTER TABLE "Reaction" ADD COLUMN "postId" TEXT;

UPDATE "Reaction" SET "postId" = 'post_' || "mediaId";

ALTER TABLE "Reaction" DROP CONSTRAINT "Reaction_mediaId_fkey";
DROP INDEX IF EXISTS "Reaction_mediaId_guestName_emoji_key";
ALTER TABLE "Reaction" DROP COLUMN "mediaId";
ALTER TABLE "Reaction" ALTER COLUMN "postId" SET NOT NULL;

-- Migrate Comment from mediaId to postId
ALTER TABLE "Comment" ADD COLUMN "postId" TEXT;

UPDATE "Comment" SET "postId" = 'post_' || "mediaId";

ALTER TABLE "Comment" DROP CONSTRAINT "Comment_mediaId_fkey";
ALTER TABLE "Comment" DROP COLUMN "mediaId";
ALTER TABLE "Comment" ALTER COLUMN "postId" SET NOT NULL;

-- AddForeignKey
ALTER TABLE "Post" ADD CONSTRAINT "Post_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "Event"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Post" ADD CONSTRAINT "Post_momentId_fkey" FOREIGN KEY ("momentId") REFERENCES "EventMoment"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "Post" ADD CONSTRAINT "Post_promptId_fkey" FOREIGN KEY ("promptId") REFERENCES "EventPrompt"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "Media" ADD CONSTRAINT "Media_postId_fkey" FOREIGN KEY ("postId") REFERENCES "Post"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "Reaction" ADD CONSTRAINT "Reaction_postId_fkey" FOREIGN KEY ("postId") REFERENCES "Post"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "Comment" ADD CONSTRAINT "Comment_postId_fkey" FOREIGN KEY ("postId") REFERENCES "Post"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- CreateIndex
CREATE UNIQUE INDEX "Reaction_postId_guestName_emoji_key" ON "Reaction"("postId", "guestName", "emoji");
