import { NextResponse, type NextRequest } from "next/server"
import { UNAUTHENTICATED_PATHS as PUBLIC_PATHS } from "@/lib/site"

const SESSION_COOKIE = "fs_session"

/**
 * Optimistic check only: no cookie → send to /login (or 401 for the API).
 * The real check happens in the Data Access Layer on every page, action and route.
 */
export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl
  const hasSession = request.cookies.has(SESSION_COOKIE)
  if (hasSession || PUBLIC_PATHS.some((p) => pathname === p || pathname.startsWith(`${p}/`))) {
    return NextResponse.next()
  }
  if (pathname.startsWith("/api/")) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }
  return NextResponse.redirect(new URL("/login", request.url))
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|ico|webmanifest)$).*)"],
}
