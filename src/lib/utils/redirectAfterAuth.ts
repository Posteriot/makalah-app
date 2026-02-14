/**
 * Redirect After Auth Utility
 *
 * Handles redirect URL validation and sanitization for post-auth flow.
 * Ensures users are redirected to allowed paths only.
 */

// Whitelist of allowed redirect paths
const ALLOWED_REDIRECT_PATHS = [
  "/get-started",
  "/checkout/bpp",
  "/checkout/pro",
  "/chat",
  "/dashboard",
  "/settings",
]

const DEFAULT_REDIRECT = "/"

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

  // Decode if URL-encoded
  const decodedRedirect = decodeURIComponent(redirect)

  // Check if redirect starts with any allowed path
  const isAllowed = ALLOWED_REDIRECT_PATHS.some((path) =>
    decodedRedirect.startsWith(path)
  )

  if (isAllowed) {
    return `${origin}${decodedRedirect}`
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
