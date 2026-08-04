import { cookies } from "next/headers";
import {
  HOST_ACCESS_COOKIE,
  HOST_ACCESS_MAX_AGE_SECONDS,
  signHostAccess,
  verifyHostAccess,
  type HostAccessPayload,
} from "@/lib/host-access-crypto";

export {
  HOST_ACCESS_COOKIE,
  signHostAccess,
  verifyHostAccess,
  type HostAccessPayload,
} from "@/lib/host-access-crypto";

/** Read + verify the host access cookie (server components / route handlers). */
export async function readHostAccess(): Promise<HostAccessPayload | null> {
  const store = await cookies();
  return verifyHostAccess(store.get(HOST_ACCESS_COOKIE)?.value);
}

export async function createHostAccess(): Promise<void> {
  const token = await signHostAccess();
  const store = await cookies();
  store.set(HOST_ACCESS_COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure:
      process.env.NODE_ENV === "production" &&
      process.env.COOKIE_SECURE !== "false",
    path: "/",
    maxAge: HOST_ACCESS_MAX_AGE_SECONDS,
  });
}

export async function clearHostAccess(): Promise<void> {
  const store = await cookies();
  store.delete(HOST_ACCESS_COOKIE);
}
