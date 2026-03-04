import { resolveQuotaOffer } from "@/lib/billing/quota-offer-policy"
import type { EffectiveTier } from "@/lib/utils/subscription"

export interface ChatQuotaErrorPayload {
  error?: string
  reason?: string
  message?: string
  action?: string
}

export function parseChatErrorPayload(error: Error | undefined): ChatQuotaErrorPayload | null {
  if (!error?.message) return null

  try {
    const parsed = JSON.parse(error.message) as ChatQuotaErrorPayload
    return parsed && typeof parsed === "object" ? parsed : null
  } catch {
    return null
  }
}

export function isQuotaExceededChatError(error: Error | undefined): boolean {
  if (!error?.message) return false

  const parsedPayload = parseChatErrorPayload(error)
  if (parsedPayload?.error === "quota_exceeded") return true

  return error.message.toLowerCase().includes("quota_exceeded")
}

export function buildChatQuotaOfferFromError(
  error: Error | undefined,
  tier: EffectiveTier
) {
  if (!isQuotaExceededChatError(error)) return null

  const parsedPayload = parseChatErrorPayload(error)
  const quotaReason =
    parsedPayload && typeof parsedPayload.reason === "string"
      ? parsedPayload.reason
      : undefined

  return resolveQuotaOffer({
    tier,
    context: "chat_error",
    visualState: "critical",
    quotaReason,
  })
}
