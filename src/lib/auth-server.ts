import { convexBetterAuthNextJs } from "@convex-dev/better-auth/nextjs";
import { cookies } from "next/headers";

// Lazy initialization — convexBetterAuthNextJs() throws if env vars are
// missing, which happens during Vercel build's "Collecting page data" phase.
// Deferring creation to first request ensures env vars are available.
type RouteHandler = (req: Request) => Promise<Response>;
let _authHandler: { GET: RouteHandler; POST: RouteHandler } | null = null;

function getAuthHandler() {
  if (!_authHandler) {
    const { handler: h } = convexBetterAuthNextJs({
      convexUrl: process.env.NEXT_PUBLIC_CONVEX_URL!,
      convexSiteUrl: process.env.NEXT_PUBLIC_CONVEX_SITE_URL!,
    });
    _authHandler = h as { GET: RouteHandler; POST: RouteHandler };
  }
  return _authHandler;
}

// Proxy object so `export const { GET, POST } = handler` works in route.ts
export const handler = {
  GET: (req: Request) => getAuthHandler().GET(req),
  POST: (req: Request) => getAuthHandler().POST(req),
};

/**
 * Get the BetterAuth cookie string from the `ba_session` browser cookie.
 *
 * SessionCookieSync (providers.tsx) reads all cookies from crossDomainClient's
 * localStorage and encodes them into `ba_session` as a URL-encoded cookie string.
 * Format after decoding: "; __Secure-better-auth.session_token=xxx; ..."
 */
async function getBetterAuthCookies(): Promise<string | null> {
  const cookieStore = await cookies();
  const baCookie = cookieStore.get("ba_session");
  if (!baCookie?.value) return null;
  try {
    return decodeURIComponent(baCookie.value);
  } catch {
    return null;
  }
}

/**
 * Check if the current request has a valid BetterAuth session.
 * Works with cross-domain auth by reading the synced `ba_session` cookie.
 */
export async function isAuthenticated(): Promise<boolean> {
  const token = await getToken();
  return !!token;
}

/**
 * Get a Convex JWT token from BetterAuth.
 *
 * Reads the session cookie string from `ba_session` browser cookie, then
 * calls Convex's `/api/auth/convex/token` endpoint with the cookie forwarded
 * as `Better-Auth-Cookie` header (which the cross-domain server plugin converts
 * to a regular Cookie header).
 */
export async function getToken(): Promise<string | null> {
  const betterAuthCookies = await getBetterAuthCookies();
  if (!betterAuthCookies) return null;

  try {
    const response = await fetch(`${process.env.NEXT_PUBLIC_CONVEX_SITE_URL}/api/auth/convex/token`, {
      headers: {
        "Better-Auth-Cookie": betterAuthCookies,
      },
    });

    if (!response.ok) return null;
    const data = await response.json();
    return data?.token ?? null;
  } catch {
    return null;
  }
}
