import { NextResponse, type NextRequest } from "next/server";

/**
 * Auth gate for protected routes. Instead of redirecting to a /login URL
 * we bounce the user home with `?auth=login&next=<path>`. The home page
 * mounts AuthModalUrlSync, which reads those params and opens the modal
 * — so the user never sees a /login page in the address bar.
 */
export function proxy(request: NextRequest) {
  const hasAuth = request.cookies.getAll().some(
    (c) => c.name.startsWith("sb-") && c.name.includes("auth-token")
  );
  const protectedPaths = ["/trips", "/profile", "/favorites"];
  const isProtected = protectedPaths.some((p) => request.nextUrl.pathname.startsWith(p));

  if (isProtected && !hasAuth) {
    const url = request.nextUrl.clone();
    url.pathname = "/";
    url.search = "";
    url.searchParams.set("auth", "login");
    url.searchParams.set("next", request.nextUrl.pathname);
    return NextResponse.redirect(url);
  }
  return NextResponse.next();
}

export const config = {
  matcher: ["/trips/:path*", "/profile/:path*", "/favorites/:path*"],
};
