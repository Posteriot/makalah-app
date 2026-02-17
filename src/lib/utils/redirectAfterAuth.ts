/**
 * Redirect After Auth Utility
 *
 * Handles redirect URL validation and sanitization for post-auth flow.
 * Ensures users are redirected to allowed paths only.
 */

// Whitelist of allowed redirect path prefixes.
// Use exact match or subpath boundary match (e.g. /chat or /chat/*, not /chatty).
const ALLOWED_REDIRECT_PATH_PREFIXES = [
  "/get-started",
  "/checkout/bpp",
  "/checkout/pro",
  "/chat",
  "/dashboard",
  "/settings",
  "/subscription",
]

const DEFAULT_REDIRECT = "/"

function normalizeRedirectPath(rawRedirect: string): string | null {
  let decodedRedirect = ""
  try {
    decodedRedirect = decodeURIComponent(rawRedirect)
  } catch {
    return null
  }

  if (!decodedRedirect.startsWith("/") || decodedRedirect.startsWith("//")) {
    return null
  }

  try {
    const parsed = new URL(decodedRedirect, "http://localhost")
    return `${parsed.pathname}${parsed.search}${parsed.hash}`
  } catch {
    return null
  }
}

function isAllowedRedirectPath(redirectPath: string): boolean {
  try {
    const pathname = new URL(redirectPath, "http://localhost").pathname
    return ALLOWED_REDIRECT_PATH_PREFIXES.some((prefix) =>
      pathname === prefix || pathname.startsWith(`${prefix}/`)
    )
  } catch {
    return false
  }
}

/**
 * Validates and returns a safe absolute redirect URL.
 *
 * Returns absolute URL (e.g. "http://localhost:3000/get-started") so that
 * BetterAuth's crossDomain plugin preserves the origin instead of rewriting
 * to the hardcoded SITE_URL. The plugin passes through absolute callbackURLs
 * without modification.
 *
 * @param searchParams - URLSearchParams from the current URL
 * @param defaultUrl - Override the default redirect path (e.g. "/get-started" for sign-up)
 * @returns Safe absolute redirect URL (origin + whitelisted path)
 */
export function getRedirectUrl(
  searchParams: URLSearchParams,
  defaultUrl: string = DEFAULT_REDIRECT,
): string {
  const origin = typeof window !== "undefined" ? window.location.origin : ""

  // Check redirect_url first (set by proxy.ts/middleware), then redirect (set by PricingCard)
  const redirect = searchParams.get("redirect_url") ?? searchParams.get("redirect")

  // If no redirect param, return default
  if (!redirect) {
    return `${origin}${defaultUrl}`
  }

  const normalizedRedirect = normalizeRedirectPath(redirect)
  if (normalizedRedirect && isAllowedRedirectPath(normalizedRedirect)) {
    return `${origin}${normalizedRedirect}`
  }

  return `${origin}${defaultUrl}`
}

/**
 * Checks if a redirect URL targets a checkout page.
 * Used to determine if onboarding should be marked as complete.
 *
 * @param redirectUrl - The redirect URL to check
 * @returns True if redirect is to a checkout page
 */
export function isCheckoutRedirect(redirectUrl: string): boolean {
  try {
    const pathname = new URL(redirectUrl, "http://localhost").pathname
    return pathname.startsWith("/checkout/")
  } catch {
    return redirectUrl.startsWith("/checkout/")
  }
}
