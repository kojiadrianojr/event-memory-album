/**
 * Parse invite list files.
 * Supported formats:
 * - Legacy wedding CSV: list,id,groupName,guestName,code (header row optional)
 * - Simple CSV: groupName,guestName,code
 * - Dash-separated: groupName-guestName-code
 */

export type InviteImportRow = {
  groupName: string;
  guestName: string;
  code: string;
};

export type InviteImportGroup = {
  code: string;
  groupName: string | null;
  members: { name: string }[];
};

export type InviteImportResult = {
  groups: InviteImportGroup[];
  errors: { line: number; text: string; message: string }[];
};

function normalizeCode(code: string): string {
  return code.trim().toUpperCase();
}

/** RFC-style CSV line parse (handles quoted fields with commas). */
function parseCsvLine(line: string): string[] {
  const fields: string[] = [];
  let current = "";
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const c = line[i]!;
    if (c === '"') {
      if (inQuotes && line[i + 1] === '"') {
        current += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (c === "," && !inQuotes) {
      fields.push(current.trim());
      current = "";
    } else {
      current += c;
    }
  }
  fields.push(current.trim());
  return fields;
}

function isHeaderRow(fields: string[]): boolean {
  const lower = fields.map((f) => f.toLowerCase());
  return lower.includes("guestname") && lower.includes("code");
}

type ColumnMap = {
  groupName: number;
  guestName: number;
  code: number;
};

function columnMapForFields(fields: string[]): ColumnMap | null {
  if (fields.length === 5) {
    return { groupName: 2, guestName: 3, code: 4 };
  }
  if (fields.length === 3) {
    return { groupName: 0, guestName: 1, code: 2 };
  }
  return null;
}

function parseDashLine(line: string): string[] | null {
  const dashParts = line.split("-");
  if (dashParts.length >= 3) {
    const code = dashParts[dashParts.length - 1]!.trim();
    const guestName = dashParts[dashParts.length - 2]!.trim();
    const groupName = dashParts.slice(0, -2).join("-").trim();
    return [groupName, guestName, code];
  }
  return null;
}

function parseFields(line: string): string[] | null {
  const trimmed = line.trim();
  if (!trimmed) return null;

  if (trimmed.includes(",")) {
    const parts = parseCsvLine(trimmed);
    if (isHeaderRow(parts)) return null;
    const map = columnMapForFields(parts);
    if (map) {
      return [
        parts[map.groupName] ?? "",
        parts[map.guestName] ?? "",
        parts[map.code] ?? "",
      ];
    }
  }

  return parseDashLine(trimmed);
}

export function parseInviteImportText(text: string): InviteImportResult {
  const lines = text.split(/\r?\n/);
  const rows: InviteImportRow[] = [];
  const errors: InviteImportResult["errors"] = [];

  lines.forEach((line, index) => {
    const lineNum = index + 1;
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) return;

    if (trimmed.includes(",") && isHeaderRow(parseCsvLine(trimmed))) {
      return;
    }

    const fields = parseFields(line);
    if (!fields) {
      errors.push({
        line: lineNum,
        text: trimmed,
        message:
          'Expected "list,id,groupName,guestName,code", "groupName,guestName,code", or "groupName-guestName-code"',
      });
      return;
    }

    const [groupName, guestName, code] = fields;
    if (!guestName || !code) {
      errors.push({
        line: lineNum,
        text: trimmed,
        message: "guestName and code are required",
      });
      return;
    }

    const normalizedCode = normalizeCode(code);
    if (!/^[A-Z0-9]{6}$/.test(normalizedCode)) {
      errors.push({
        line: lineNum,
        text: trimmed,
        message: "code must be 6 uppercase alphanumeric characters",
      });
      return;
    }

    rows.push({
      groupName: groupName.trim(),
      guestName: guestName.trim(),
      code: normalizedCode,
    });
  });

  const byCode = new Map<string, InviteImportGroup>();

  for (const row of rows) {
    let group = byCode.get(row.code);
    const rowGroupName = row.groupName || null;

    if (!group) {
      group = { code: row.code, groupName: rowGroupName, members: [] };
      byCode.set(row.code, group);
    } else if (
      rowGroupName &&
      group.groupName &&
      group.groupName !== rowGroupName
    ) {
      errors.push({
        line: 0,
        text: row.code,
        message: `Code ${row.code} has conflicting group names`,
      });
      continue;
    } else if (rowGroupName && !group.groupName) {
      group.groupName = rowGroupName;
    }

    if (!group.members.some((m) => m.name === row.guestName)) {
      group.members.push({ name: row.guestName });
    }
  }

  return {
    groups: Array.from(byCode.values()),
    errors,
  };
}

/** Flatten grouped invites into API-ready rows (one row per member). */
export function flattenInviteGroups(
  groups: InviteImportGroup[]
): InviteImportRow[] {
  const rows: InviteImportRow[] = [];
  for (const group of groups) {
    for (const member of group.members) {
      rows.push({
        groupName: group.groupName ?? "",
        guestName: member.name,
        code: group.code,
      });
    }
  }
  return rows;
}
