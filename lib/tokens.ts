import { customAlphabet } from "nanoid";
import bcrypt from "bcryptjs";
import { createHash, randomUUID } from "crypto";

const nanoid8 = customAlphabet("ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789", 8);

export function generateAccessToken(): string {
  return nanoid8();
}

export function generateViewToken(): string {
  return nanoid8();
}

export function generateAdminToken(): string {
  return randomUUID();
}

export function hashAdminTokenLookup(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

export async function hashAdminToken(token: string): Promise<string> {
  const rounds = parseInt(process.env.ADMIN_BCRYPT_ROUNDS ?? "12", 10);
  return bcrypt.hash(token, rounds);
}

export async function verifyAdminToken(
  token: string,
  hash: string
): Promise<boolean> {
  return bcrypt.compare(token, hash);
}
