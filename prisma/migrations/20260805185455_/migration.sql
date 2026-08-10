-- AlterTable
ALTER TABLE "InvitationMember" RENAME CONSTRAINT "InvitedGuest_pkey" TO "InvitationMember_pkey";

-- RenameForeignKey
ALTER TABLE "InvitationMember" RENAME CONSTRAINT "InvitedGuest_invitationId_fkey" TO "InvitationMember_invitationId_fkey";
