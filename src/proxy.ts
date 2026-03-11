import { NextResponse, type NextRequest } from "next/server";

export function proxy(request: NextRequest) {
  const hasAuth = request.cookies.getAll().some(
    (c) => c.name.startsWith("sb-") && c.name.includes("auth-token")
  );
  const protectedPaths = ["/trips", "/profile", "/favorites"];
  const isProtected = protectedPaths.some((p) => request.nextUrl.pathname.startsWith(p));

  if (isProtected && !hasAuth) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    url.searchParams.set("redirectTo", request.nextUrl.pathname);
    return NextResponse.redirect(url);
  }
  return NextResponse.next();
}

export const config = {
  matcher: ["/trips/:path*", "/profile/:path*", "/favorites/:path*"],
};
