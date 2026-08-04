import {
  S3Client,
  DeleteObjectCommand,
  GetObjectCommand,
  PutObjectCommand,
} from "@aws-sdk/client-s3";
import type { Readable } from "stream";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { getS3UploadMode } from "@/lib/s3-upload-mode";

function resolveS3Endpoint(): string {
  const endpoint = process.env.S3_ENDPOINT;
  if (!endpoint) {
    throw new Error("S3_ENDPOINT is not configured");
  }
  if (getS3UploadMode() === "direct" && process.env.S3_INTERNAL_ENDPOINT) {
    return process.env.S3_INTERNAL_ENDPOINT;
  }
  return endpoint;
}

let s3Client: S3Client | undefined;

function getS3Client(): S3Client {
  if (!s3Client) {
    s3Client = new S3Client({
      region: "auto",
      endpoint: resolveS3Endpoint(),
      credentials: {
        accessKeyId: process.env.S3_ACCESS_KEY_ID!,
        secretAccessKey: process.env.S3_SECRET_ACCESS_KEY!,
      },
      forcePathStyle: true,
    });
  }
  return s3Client;
}

export async function createPresignedPutUrl(
  objectKey: string,
  mimeType: string,
  expiresIn = 900
): Promise<string> {
  const command = new PutObjectCommand({
    Bucket: process.env.S3_BUCKET_NAME!,
    Key: objectKey,
    ContentType: mimeType,
  });
  return getSignedUrl(getS3Client(), command, { expiresIn });
}

export async function deleteObject(objectKey: string): Promise<void> {
  const command = new DeleteObjectCommand({
    Bucket: process.env.S3_BUCKET_NAME!,
    Key: objectKey,
  });
  await getS3Client().send(command);
}

export function getPublicUrl(objectKey: string): string {
  return `${process.env.S3_PUBLIC_URL}/${objectKey}`;
}

export function objectKeyFromPublicUrl(url: string): string | null {
  const publicBase = process.env.S3_PUBLIC_URL ?? "";
  if (publicBase && url.startsWith(publicBase)) {
    return url.slice(publicBase.length + 1);
  }

  try {
    const { pathname } = new URL(url);
    const bucket = process.env.S3_BUCKET_NAME ?? "";
    const segments = pathname.split("/").filter(Boolean);
    if (segments.length < 2) return null;

    if (bucket && segments[0] === bucket) {
      return segments.slice(1).join("/");
    }

    if (segments[0] === "events") {
      return segments.join("/");
    }
  } catch {
    return null;
  }

  return null;
}

export async function getObject(objectKey: string, range?: string) {
  const command = new GetObjectCommand({
    Bucket: process.env.S3_BUCKET_NAME!,
    Key: objectKey,
    ...(range ? { Range: range } : {}),
  });
  return getS3Client().send(command);
}

export async function getObjectBuffer(objectKey: string): Promise<Buffer> {
  const result = await getObject(objectKey);
  const stream = result.Body as Readable;
  const chunks: Buffer[] = [];
  for await (const chunk of stream) {
    chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
  }
  return Buffer.concat(chunks);
}

export async function putObject(
  objectKey: string,
  body: Buffer,
  contentType: string
): Promise<void> {
  const command = new PutObjectCommand({
    Bucket: process.env.S3_BUCKET_NAME!,
    Key: objectKey,
    Body: body,
    ContentType: contentType,
  });
  await getS3Client().send(command);
}
