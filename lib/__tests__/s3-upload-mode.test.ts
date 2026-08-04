import { afterEach, describe, expect, it } from "vitest";
import { getS3UploadMode } from "@/lib/s3-upload-mode";

describe("getS3UploadMode", () => {
  const env = process.env;

  afterEach(() => {
    process.env = { ...env };
  });

  it("defaults to presigned for local HTTP", () => {
    delete process.env.S3_DIRECT_UPLOAD;
    process.env.COOKIE_SECURE = "false";
    expect(getS3UploadMode()).toBe("presigned");
  });

  it("uses direct when COOKIE_SECURE is true", () => {
    delete process.env.S3_DIRECT_UPLOAD;
    process.env.COOKIE_SECURE = "true";
    expect(getS3UploadMode()).toBe("direct");
  });

  it("respects explicit S3_DIRECT_UPLOAD override", () => {
    process.env.COOKIE_SECURE = "true";
    process.env.S3_DIRECT_UPLOAD = "false";
    expect(getS3UploadMode()).toBe("presigned");

    process.env.COOKIE_SECURE = "false";
    process.env.S3_DIRECT_UPLOAD = "true";
    expect(getS3UploadMode()).toBe("direct");
  });
});
