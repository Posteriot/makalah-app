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
]

/**
 * Validates and returns a safe redirect URL.
 *
 * @param searchParams - URLSearchParams from the current URL
 * @returns Safe redirect URL (whitelisted path or default)
 */
export function getRedirectUrl(searchParams: URLSearchParams): string {
  const redirect = searchParams.get("redirect")

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
 * Returns undefined if no valid redirect is found, allowing Clerk default behavior.
 *
 * @param searchParams - URLSearchParams from the current URL
 * @returns Redirect URL string or undefined
 */
export function getClerkRedirectUrl(
  searchParams: URLSearchParams
): string | undefined {
  const redirect = searchParams.get("redirect")

  if (!redirect) {
    return undefined
  }

  const decodedRedirect = decodeURIComponent(redirect)

  const isAllowed = ALLOWED_REDIRECT_PATHS.some((path) =>
    decodedRedirect.startsWith(path)
  )

  if (isAllowed) {
    return decodedRedirect
  }

  return undefined
}
