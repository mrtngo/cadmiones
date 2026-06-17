import { NextResponse, type NextRequest } from "next/server";
import { AUTH_COOKIE, isAuthenticated } from "@/lib/auth";

export function proxy(request: NextRequest) {
  const session = request.cookies.get(AUTH_COOKIE)?.value;
  if (isAuthenticated(session)) return NextResponse.next();

  const loginUrl = new URL("/login", request.url);
  loginUrl.searchParams.set("next", request.nextUrl.pathname + request.nextUrl.search);
  return NextResponse.redirect(loginUrl);
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|login|api/login|api/logout).*)",
  ],
};
