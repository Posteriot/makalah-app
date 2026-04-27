import { convexBetterAuthNextJs } from "@convex-dev/better-auth/nextjs";
import { cookies } from "next/headers";

// Lazy initialization — convexBetterAuthNextJs() throws if env vars are
// missing, which happens during Vercel build's "Collecting page data" phase.
// Deferring creation to first request ensures env vars are available.
type RouteHandler = (req: Request) => Promise<Response>;
let _authHandler: { GET: RouteHandler; POST: RouteHandler } | null = null;

function getNestedErrorValues(error: unknown): unknown[] {
  if (!error || typeof error !== "object") return [];

  const values: unknown[] = [];
  const maybeError = error as {
    cause?: unknown;
    errors?: unknown[];
    code?: unknown;
  };

  if (maybeError.cause) values.push(maybeError.cause);
  if (Array.isArray(maybeError.errors)) values.push(...maybeError.errors);
  if (typeof maybeError.code === "string") values.push(maybeError.code);

  return values;
}

export function isAuthProxyNetworkError(error: unknown): boolean {
  const queue = [error];
  const seen = new Set<unknown>();

  while (queue.length > 0) {
    const current = queue.shift();
    if (seen.has(current)) continue;
    seen.add(current);

    if (current instanceof DOMException) {
      if (current.name === "AbortError" || current.name === "TimeoutError") {
        return true;
      }
    }

    const message = current instanceof Error ? current.message : String(current);
    const lower = message.toLowerCase();
    if (
      lower.includes("fetch failed") ||
      lower.includes("etimedout") ||
      lower.includes("econnreset") ||
      lower.includes("econnrefused") ||
      lower.includes("network error") ||
      lower.includes("timed out")
    ) {
      return true;
    }

    queue.push(...getNestedErrorValues(current));
  }

  return false;
}

export async function runAuthProxyWithBoundary(
  routeHandler: RouteHandler,
  req: Request
): Promise<Response> {
  try {
    return await routeHandler(req);
  } catch (error) {
    if (!isAuthProxyNetworkError(error)) {
      throw error;
    }

    console.warn("[auth-server] Auth proxy network error", {
      error: error instanceof Error ? error.message : String(error),
    });

    return Response.json(
      { error: "auth_service_unavailable" },
      {
        status: 503,
        headers: {
          "Cache-Control": "no-store",
        },
      }
    );
  }
}

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
  GET: (req: Request) => runAuthProxyWithBoundary(getAuthHandler().GET, req),
  POST: (req: Request) => runAuthProxyWithBoundary(getAuthHandler().POST, req),
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

const CONVEX_TOKEN_TIMEOUT_MS = 5_000;
const CONVEX_TOKEN_MAX_ATTEMPTS = 2;
const CONVEX_TOKEN_RETRY_DELAY_MS = 300;

type TokenEndpointAttempt =
  | { kind: "response"; response: Response }
  | { kind: "network_error"; error: unknown };

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function fetchConvexTokenEndpoint(
  betterAuthCookies: string,
): Promise<TokenEndpointAttempt> {
  try {
    const response = await fetch(`${process.env.NEXT_PUBLIC_CONVEX_SITE_URL}/api/auth/convex/token`, {
      headers: {
        "Better-Auth-Cookie": betterAuthCookies,
      },
      signal: AbortSignal.timeout(CONVEX_TOKEN_TIMEOUT_MS),
    });
    return { kind: "response", response };
  } catch (error) {
    return { kind: "network_error", error };
  }
}

async function validateBetterAuthCookies(
  betterAuthCookies: string | null
): Promise<BetterAuthCookieValidation> {
  if (!betterAuthCookies) return { status: "missing" };

  for (let attempt = 1; attempt <= CONVEX_TOKEN_MAX_ATTEMPTS; attempt += 1) {
    const result = await fetchConvexTokenEndpoint(betterAuthCookies);

    if (result.kind === "network_error") {
      if (attempt < CONVEX_TOKEN_MAX_ATTEMPTS) {
        console.warn("[auth-server] Convex token fetch network error, retrying", {
          attempt,
          maxAttempts: CONVEX_TOKEN_MAX_ATTEMPTS,
        });
        await delay(CONVEX_TOKEN_RETRY_DELAY_MS);
        continue;
      }
      return { status: "network_error" };
    }

    const { response } = result;

    // 5xx = server/infra issue (cold start, overload) — retry once, then treat
    // same as network error so transient Convex downtime doesn't invalidate the session.
    if (response.status >= 500) {
      if (attempt < CONVEX_TOKEN_MAX_ATTEMPTS) {
        console.warn("[auth-server] Convex token endpoint returned 5xx, retrying", {
          attempt,
          maxAttempts: CONVEX_TOKEN_MAX_ATTEMPTS,
          status: response.status,
        });
        await delay(CONVEX_TOKEN_RETRY_DELAY_MS);
        continue;
      }
      return { status: "network_error" };
    }

    if (!response.ok) return { status: "invalid" };

    const data = await response.json();
    if (typeof data?.token === "string" && data.token.length > 0) {
      return { status: "authenticated", token: data.token };
    }
    return { status: "invalid" };
  }

  return { status: "network_error" };
}
