const CHAT_DESTINATION = "/chat"

/**
 * Resolve unified Chat entry href for nav/CTA.
 * Signed-in users go directly to chat; signed-out users are sent to sign-up
 * and redirected back to chat after auth.
 */
export function resolveChatEntryHref(isSignedIn: boolean): string {
  if (isSignedIn) return CHAT_DESTINATION
  return `/sign-up?redirect_url=${encodeURIComponent(CHAT_DESTINATION)}`
}

