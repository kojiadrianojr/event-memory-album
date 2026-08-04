import { describe, expect, it } from "vitest";
import { inviteLoginSchema } from "@/lib/validations";

describe("inviteLoginSchema", () => {
  it("accepts invitationId and guestName", () => {
    const result = inviteLoginSchema.safeParse({
      invitationId: "inv_abc123",
      guestName: "Alex",
    });
    expect(result.success).toBe(true);
  });

  it("rejects missing invitationId", () => {
    const result = inviteLoginSchema.safeParse({
      guestName: "Alex",
    });
    expect(result.success).toBe(false);
  });

  it("rejects empty guestName", () => {
    const result = inviteLoginSchema.safeParse({
      invitationId: "inv_abc123",
      guestName: "",
    });
    expect(result.success).toBe(false);
  });
});
