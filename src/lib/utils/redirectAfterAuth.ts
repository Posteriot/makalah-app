/**
 * Redirect After Auth Utility
 *
 * Handles redirect URL validation and sanitization for post-signup flow.
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

/**
 * Validates and returns a safe redirect URL.
 *
 * @param searchParams - URLSearchParams from the current URL
 * @returns Safe redirect URL (whitelisted path or default)
 */
export function getRedirectUrl(searchParams: URLSearchParams): string {
  // Check redirect_url first (set by proxy.ts/middleware), then redirect (set by PricingCard)
  const redirect = searchParams.get("redirect_url") ?? searchParams.get("redirect")

  // If no redirect param, return default
  if (!redirect) {
    return "/get-started"
  }

  // Decode if URL-encoded
  const decodedRedirect = decodeURIComponent(redirect)

  // Check if redirect starts with any allowed path
  const isAllowed = ALLOWED_REDIRECT_PATHS.some((path) =>
    decodedRedirect.startsWith(path)
  )

  if (isAllowed) {
    return decodedRedirect
  }

  // Default: go to get-started for first-time users
  return "/get-started"
}

/**
 * Checks if a redirect URL targets a checkout page.
 * Used to determine if onboarding should be marked as complete.
 *
 * @param redirectUrl - The redirect URL to check
 * @returns True if redirect is to a checkout page
 */
export function isCheckoutRedirect(redirectUrl: string): boolean {
  return redirectUrl.startsWith("/checkout/")
}

/**
 * Gets the redirect URL from search params as a string (for Clerk prop).
 * Always returns a valid redirect URL.
 *
 * @param searchParams - URLSearchParams from the current URL
 * @param defaultRedirect - Default redirect path (default: /get-started for sign-up, /chat for sign-in)
 * @returns Redirect URL string (never undefined)
 */
export function getClerkRedirectUrl(
  searchParams: URLSearchParams,
  defaultRedirect: string = "/get-started"
): string {
  // Check redirect_url first (set by proxy.ts/middleware), then redirect (set by PricingCard)
  const redirect = searchParams.get("redirect_url") ?? searchParams.get("redirect")

  if (!redirect) {
    return defaultRedirect
  }

  const decodedRedirect = decodeURIComponent(redirect)

  const isAllowed = ALLOWED_REDIRECT_PATHS.some((path) =>
    decodedRedirect.startsWith(path)
  )

  if (isAllowed) {
    return decodedRedirect
  }

  return defaultRedirect
}
