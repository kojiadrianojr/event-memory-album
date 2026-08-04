import type { InvitationRowInput } from "@/lib/validations";

export type InvitationCreateInput = {
  code: string;
  groupName: string | null;
  members: { name: string }[];
};

/** Group flat invitation rows by code for nested Prisma create. */
export function groupInvitationRows(
  rows: InvitationRowInput[]
): InvitationCreateInput[] {
  const byCode = new Map<string, InvitationCreateInput>();

  for (const row of rows) {
    let group = byCode.get(row.code);
    if (!group) {
      group = {
        code: row.code,
        groupName: row.groupName?.trim() || null,
        members: [],
      };
      byCode.set(row.code, group);
    }

    if (
      row.groupName?.trim() &&
      group.groupName &&
      group.groupName !== row.groupName.trim()
    ) {
      throw new Error(`Conflicting group names for invite code ${row.code}`);
    }

    if (row.groupName?.trim() && !group.groupName) {
      group.groupName = row.groupName.trim();
    }

    if (!group.members.some((m) => m.name === row.guestName)) {
      group.members.push({ name: row.guestName });
    }
  }

  return Array.from(byCode.values());
}
