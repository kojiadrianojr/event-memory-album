import { describe, expect, it } from "vitest";
import {
  deleteCommentSchema,
  updateCommentSchema,
  updatePostSchema,
  deletePostSchema,
} from "@/lib/validations";

describe("updatePostSchema", () => {
  const base = {
    token: "ABCD1234",
    uploaderName: "Alex",
  };

  it("accepts caption and momentId updates", () => {
    const result = updatePostSchema.safeParse({
      ...base,
      caption: "Updated caption",
      momentId: "moment_1",
    });
    expect(result.success).toBe(true);
  });

  it("accepts null momentId to clear moment", () => {
    const result = updatePostSchema.safeParse({
      ...base,
      momentId: null,
    });
    expect(result.success).toBe(true);
  });

  it("rejects invalid token length", () => {
    const result = updatePostSchema.safeParse({
      ...base,
      token: "short",
      caption: "Hi",
    });
    expect(result.success).toBe(false);
  });
});

describe("deletePostSchema", () => {
  it("accepts valid delete payload", () => {
    const result = deletePostSchema.safeParse({
      token: "ABCD1234",
      uploaderName: "Alex",
    });
    expect(result.success).toBe(true);
  });
});

describe("updateCommentSchema", () => {
  it("accepts valid update payload", () => {
    const result = updateCommentSchema.safeParse({
      token: "ABCD1234",
      authorName: "Alex",
      content: "Updated comment",
    });
    expect(result.success).toBe(true);
  });

  it("rejects empty content", () => {
    const result = updateCommentSchema.safeParse({
      token: "ABCD1234",
      authorName: "Alex",
      content: "",
    });
    expect(result.success).toBe(false);
  });
});

describe("deleteCommentSchema", () => {
  it("accepts valid delete payload", () => {
    const result = deleteCommentSchema.safeParse({
      token: "ABCD1234",
      authorName: "Alex",
    });
    expect(result.success).toBe(true);
  });
});
