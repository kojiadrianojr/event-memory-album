import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { isHostAccessConfigured } from "@/lib/host-access-config";
import {
  HOST_ACCESS_COOKIE,
  verifyHostAccess,
} from "@/lib/host-access-crypto";
import { SESSION_COOKIE, verifySession } from "@/lib/session-crypto";

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (pathname === "/create") {
    if (!isHostAccessConfigured()) {
      return NextResponse.redirect(
        new URL("/host/login?error=not-configured", request.url)
      );
    }

    const hostAccess = await verifyHostAccess(
      request.cookies.get(HOST_ACCESS_COOKIE)?.value
    );
    if (!hostAccess) {
      return NextResponse.redirect(
        new URL("/host/login?next=/create", request.url)
      );
    }
  }

  // Extract the token segment from /event/[token]/...
  const match = pathname.match(/^\/event\/([^/]*)/);
  if (match) {
    const token = match[1];
    // Token must be exactly 8 characters (presence check only — DB validation is in the layout)
    if (!token || token.length !== 8) {
      return NextResponse.redirect(
        new URL("/?error=invalid-token", request.url)
      );
    }

    // Require a valid signed guest session (full DB validation happens in the layout).
    const session = await verifySession(
      request.cookies.get(SESSION_COOKIE)?.value
    );
    if (!session) {
      return NextResponse.redirect(
        new URL("/?error=invalid-token", request.url)
      );
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/event/:path*", "/create"],
};
