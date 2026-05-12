import { NextResponse, type NextRequest } from "next/server";
import createIntlMiddleware from "next-intl/middleware";
import { routing } from "./i18n/routing";

const intlMiddleware = createIntlMiddleware(routing);

// Protected paths — written WITHOUT locale prefix; we match against the
// pathname stripped of any /en/ or /ro/ prefix.
const PROTECTED_PATHS = ["/trips", "/profile", "/favorites"];

function isProtectedPath(pathname: string): boolean {
  const stripped = pathname.replace(/^\/(en|ro)(?=\/|$)/, "") || "/";
  return PROTECTED_PATHS.some((p) => stripped === p || stripped.startsWith(`${p}/`));
}

/**
 * Combined proxy: runs next-intl routing first (locale redirect / detection),
 * then enforces auth gating on protected paths. Auth failures bounce home
 * with `?auth=login&next=<path>` so the modal opens — never a /login page.
 */
export function proxy(request: NextRequest) {
  const hasAuth = request.cookies.getAll().some(
    (c) => c.name.startsWith("sb-") && c.name.includes("auth-token"),
  );

  if (isProtectedPath(request.nextUrl.pathname) && !hasAuth) {
    // Preserve the locale segment when bouncing to home so the modal opens
    // in the user's chosen language.
    const localeMatch = request.nextUrl.pathname.match(/^\/(en|ro)(?=\/|$)/);
    const locale = localeMatch?.[1] ?? routing.defaultLocale;
    const url = request.nextUrl.clone();
    url.pathname = `/${locale}`;
    url.search = "";
    url.searchParams.set("auth", "login");
    url.searchParams.set("next", request.nextUrl.pathname);
    return NextResponse.redirect(url);
  }

  return intlMiddleware(request);
}

export const config = {
  /**
   * Match every path except:
   *  - /api/*    (REST endpoints, locale-agnostic)
   *  - /auth/*   (OAuth callbacks + logout, hit directly by providers)
   *  - /_next/*  (Next internals)
   *  - Any path with a file extension (favicon, images, manifest, etc.)
   *
   * The i18n middleware needs to see ALL page requests to inject locale
   * redirects, not just the protected ones.
   */
  matcher: ["/((?!api|auth|_next|.*\\..*).*)"],
};
