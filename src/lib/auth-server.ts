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

export function decodeBetterAuthCookieValue(
  encodedValue: string | null | undefined
): string | null {
  if (!encodedValue) return null;
  try {
    return decodeURIComponent(encodedValue);
  } catch {
    return null;
  }
}

/**
 * Get the BetterAuth cookie string from the `ba_session` browser cookie.
 *
 * SessionCookieSync (providers.tsx) reads all cookies from crossDomainClient's
 * localStorage and encodes them into `ba_session` as a URL-encoded cookie string.
 * Format after decoding: "; __Secure-better-auth.session_token=xxx; ..."
 */
async function getBetterAuthCookies(): Promise<string | null> {
  const cookieStore = await cookies();
  return decodeBetterAuthCookieValue(cookieStore.get("ba_session")?.value);
}

/**
 * Check if the current request has a valid BetterAuth session.
 * Works with cross-domain auth by reading the synced `ba_session` cookie.
 */
export async function isAuthenticated(): Promise<boolean> {
  const token = await getToken();
  return !!token;
}

export async function isAuthenticatedFromBetterAuthCookies(
  betterAuthCookies: string | null
): Promise<boolean> {
  const validation = await validateBetterAuthCookies(betterAuthCookies);
  return validation.status === "authenticated" || validation.status === "network_error";
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
  return getTokenFromBetterAuthCookies(betterAuthCookies);
}

export async function getTokenFromBetterAuthCookies(
  betterAuthCookies: string | null
): Promise<string | null> {
  const validation = await validateBetterAuthCookies(betterAuthCookies);
  return validation.status === "authenticated" ? validation.token : null;
}

type BetterAuthCookieValidation =
  | { status: "missing" }
  | { status: "invalid" }
  | { status: "network_error" }
  | { status: "authenticated"; token: string };

async function validateBetterAuthCookies(
  betterAuthCookies: string | null
): Promise<BetterAuthCookieValidation> {
  if (!betterAuthCookies) return { status: "missing" };

  try {
    const response = await fetch(`${process.env.NEXT_PUBLIC_CONVEX_SITE_URL}/api/auth/convex/token`, {
      headers: {
        "Better-Auth-Cookie": betterAuthCookies,
      },
    });

    if (!response.ok) return { status: "invalid" };
    const data = await response.json();
    if (typeof data?.token === "string" && data.token.length > 0) {
      return { status: "authenticated", token: data.token };
    }
    return { status: "invalid" };
  } catch {
    return { status: "network_error" };
  }
}
