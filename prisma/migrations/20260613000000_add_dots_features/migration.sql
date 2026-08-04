-- CreateEnum extension for new media types
ALTER TYPE "MediaType" ADD VALUE IF NOT EXISTS 'TEXT';
ALTER TYPE "MediaType" ADD VALUE IF NOT EXISTS 'AUDIO';

-- AlterTable Event: add viewToken
ALTER TABLE "Event" ADD COLUMN IF NOT EXISTS "viewToken" TEXT;

-- Backfill viewToken for existing events (temporary unique placeholder)
UPDATE "Event" SET "viewToken" = UPPER(SUBSTRING(REPLACE(gen_random_uuid()::text, '-', '') FROM 1 FOR 8))
WHERE "viewToken" IS NULL;

ALTER TABLE "Event" ALTER COLUMN "viewToken" SET NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS "Event_viewToken_key" ON "Event"("viewToken");

-- AlterTable Media: nullable url, momentId, promptId
ALTER TABLE "Media" ALTER COLUMN "url" DROP NOT NULL;
ALTER TABLE "Media" ADD COLUMN IF NOT EXISTS "momentId" TEXT;
ALTER TABLE "Media" ADD COLUMN IF NOT EXISTS "promptId" TEXT;

-- CreateTable EventMoment
CREATE TABLE IF NOT EXISTS "EventMoment" (
    "id" TEXT NOT NULL,
    "eventId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    CONSTRAINT "EventMoment_pkey" PRIMARY KEY ("id")
);

-- CreateTable EventPrompt
CREATE TABLE IF NOT EXISTS "EventPrompt" (
    "id" TEXT NOT NULL,
    "eventId" TEXT NOT NULL,
    "text" TEXT NOT NULL,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    CONSTRAINT "EventPrompt_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "EventMoment" ADD CONSTRAINT "EventMoment_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "Event"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "EventPrompt" ADD CONSTRAINT "EventPrompt_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "Event"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Media" ADD CONSTRAINT "Media_momentId_fkey" FOREIGN KEY ("momentId") REFERENCES "EventMoment"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "Media" ADD CONSTRAINT "Media_promptId_fkey" FOREIGN KEY ("promptId") REFERENCES "EventPrompt"("id") ON DELETE SET NULL ON UPDATE CASCADE;
