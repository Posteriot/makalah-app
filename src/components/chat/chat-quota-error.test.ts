import { describe, expect, it } from "vitest"
import {
  buildChatQuotaOfferFromError,
  isQuotaExceededChatError,
  parseChatErrorPayload,
} from "./chat-quota-error"

describe("chat quota error helpers", () => {
  it("parses JSON payload safely", () => {
    const err = new Error(
      JSON.stringify({ error: "quota_exceeded", reason: "monthly_limit", message: "blocked" })
    )

    const parsed = parseChatErrorPayload(err)
    expect(parsed?.error).toBe("quota_exceeded")
    expect(parsed?.reason).toBe("monthly_limit")
  })

  it("detects quota_exceeded errors", () => {
    expect(isQuotaExceededChatError(new Error(JSON.stringify({ error: "quota_exceeded" })))).toBe(true)
    expect(isQuotaExceededChatError(new Error("plain quota_exceeded error"))).toBe(true)
    expect(isQuotaExceededChatError(new Error("network error"))).toBe(false)
  })

  it("maps pro monthly_limit to canonical topup route", () => {
    const err = new Error(JSON.stringify({ error: "quota_exceeded", reason: "monthly_limit" }))
    const offer = buildChatQuotaOfferFromError(err, "pro")

    expect(offer?.primaryCta.href).toBe("/checkout/bpp")
    expect(offer?.secondaryCta).toBeUndefined()
  })

  it("maps gratis monthly_limit to dual CTA", () => {
    const err = new Error(JSON.stringify({ error: "quota_exceeded", reason: "monthly_limit" }))
    const offer = buildChatQuotaOfferFromError(err, "gratis")

    expect(offer?.primaryCta.href).toBe("/checkout/bpp")
    expect(offer?.secondaryCta?.href).toBe("/checkout/pro")
  })

  it("unknown reason uses safe fallback for gratis", () => {
    const err = new Error(JSON.stringify({ error: "quota_exceeded", reason: "unknown_reason" }))
    const offer = buildChatQuotaOfferFromError(err, "gratis")

    expect(offer?.primaryCta.href).toBe("/subscription/overview")
  })

  it("returns null for non-quota errors", () => {
    const err = new Error(JSON.stringify({ error: "validation_error" }))
    const offer = buildChatQuotaOfferFromError(err, "bpp")

    expect(offer).toBeNull()
  })
})
