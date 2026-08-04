import { describe, expect, it } from "vitest";
import {
  flattenInviteGroups,
  parseInviteImportText,
} from "@/lib/invite-import";

describe("parseInviteImportText", () => {
  it("parses dash-separated lines and groups by code", () => {
    const text = [
      "Smith Family-Alice Smith-ABC123",
      "Smith Family-Bob Smith-ABC123",
      "Jones-Jane Jones-XYZ789",
    ].join("\n");

    const { groups, errors } = parseInviteImportText(text);
    expect(errors).toHaveLength(0);
    expect(groups).toHaveLength(2);

    const smith = groups.find((g) => g.code === "ABC123");
    expect(smith?.groupName).toBe("Smith Family");
    expect(smith?.members.map((m) => m.name)).toEqual([
      "Alice Smith",
      "Bob Smith",
    ]);
  });

  it("parses comma-separated CSV", () => {
    const { groups, errors } = parseInviteImportText(
      "Team A,Chris Lee,DEF456"
    );
    expect(errors).toHaveLength(0);
    expect(groups).toHaveLength(1);
    expect(groups[0]?.members[0]?.name).toBe("Chris Lee");
  });

  it("parses 5-column wedding CSV with header and empty groupName", () => {
    const text = [
      "list,id,groupName,guestName,code",
      "bea,1,,Alexandra Isabelle S. Almiñe,ZQS07Y",
      'bea,29,,"John Joshua S. Almiñe, JD",V3QD46',
      "bea,38,Parents of the Bride,Rosendo R. Almiñe,B6JMXZ",
      "bea,38,Parents of the Bride,Ma. Veronica S. Almiñe,B6JMXZ",
    ].join("\n");

    const { groups, errors } = parseInviteImportText(text);
    expect(errors).toHaveLength(0);
    expect(groups).toHaveLength(3);

    const brideParents = groups.find((g) => g.code === "B6JMXZ");
    expect(brideParents?.groupName).toBe("Parents of the Bride");
    expect(brideParents?.members).toHaveLength(2);

    const john = groups.find((g) => g.code === "V3QD46");
    expect(john?.members[0]?.name).toBe("John Joshua S. Almiñe, JD");
  });

  it("reports invalid lines", () => {
    const { groups, errors } = parseInviteImportText("bad line");
    expect(groups).toHaveLength(0);
    expect(errors.length).toBeGreaterThan(0);
  });
});

describe("flattenInviteGroups", () => {
  it("expands grouped members into rows", () => {
    const rows = flattenInviteGroups([
      {
        code: "ABC123",
        groupName: "Family",
        members: [{ name: "A" }, { name: "B" }],
      },
    ]);
    expect(rows).toHaveLength(2);
    expect(rows[0]?.guestName).toBe("A");
  });
});
