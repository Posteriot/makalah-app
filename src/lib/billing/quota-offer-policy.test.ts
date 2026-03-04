import { describe, expect, it } from "vitest"
import { resolveQuotaOffer } from "./quota-offer-policy"

describe("resolveQuotaOffer", () => {
  it("gratis depleted -> dua CTA checkout bpp + checkout pro", () => {
    const result = resolveQuotaOffer({
      tier: "gratis",
      context: "banner",
      visualState: "depleted",
    })

    expect(result.primaryCta.href).toBe("/checkout/bpp")
    expect(result.secondaryCta?.href).toBe("/checkout/pro")
  })

  it("bpp depleted -> dua CTA checkout bpp + checkout pro", () => {
    const result = resolveQuotaOffer({
      tier: "bpp",
      context: "banner",
      visualState: "depleted",
    })

    expect(result.primaryCta.href).toBe("/checkout/bpp")
    expect(result.secondaryCta?.href).toBe("/checkout/pro")
  })

  it("pro depleted -> primary CTA checkout bpp (canonical topup pro)", () => {
    const result = resolveQuotaOffer({
      tier: "pro",
      context: "chat_error",
      visualState: "depleted",
      quotaReason: "monthly_limit",
    })

    expect(result.primaryCta.href).toBe("/checkout/bpp")
    expect(result.secondaryCta).toBeUndefined()
  })

  it("gratis warning/critical -> CTA ke overview", () => {
    const warning = resolveQuotaOffer({
      tier: "gratis",
      context: "banner",
      visualState: "warning",
    })
    const critical = resolveQuotaOffer({
      tier: "gratis",
      context: "banner",
      visualState: "critical",
    })

    expect(warning.primaryCta.href).toBe("/subscription/overview")
    expect(critical.primaryCta.href).toBe("/subscription/overview")
    expect(warning.secondaryCta).toBeUndefined()
    expect(critical.secondaryCta).toBeUndefined()
  })

  it("bpp/pro warning/critical -> CTA ke checkout bpp", () => {
    const bppCritical = resolveQuotaOffer({
      tier: "bpp",
      context: "banner",
      visualState: "critical",
    })
    const proWarning = resolveQuotaOffer({
      tier: "pro",
      context: "banner",
      visualState: "warning",
    })

    expect(bppCritical.primaryCta.href).toBe("/checkout/bpp")
    expect(proWarning.primaryCta.href).toBe("/checkout/bpp")
    expect(bppCritical.secondaryCta).toBeUndefined()
    expect(proWarning.secondaryCta).toBeUndefined()
  })

  it("chat_error monthly_limit override ke depleted", () => {
    const result = resolveQuotaOffer({
      tier: "gratis",
      context: "chat_error",
      visualState: "warning",
      quotaReason: "monthly_limit",
    })

    expect(result.primaryCta.href).toBe("/checkout/bpp")
    expect(result.secondaryCta?.href).toBe("/checkout/pro")
  })

  it("chat_error unknown reason fallback aman", () => {
    const gratisUnknown = resolveQuotaOffer({
      tier: "gratis",
      context: "chat_error",
      visualState: "critical",
      quotaReason: "unexpected_reason",
    })

    const proUnknown = resolveQuotaOffer({
      tier: "pro",
      context: "chat_error",
      visualState: "critical",
      quotaReason: "unexpected_reason",
    })

    expect(gratisUnknown.primaryCta.href).toBe("/subscription/overview")
    expect(proUnknown.primaryCta.href).toBe("/checkout/bpp")
  })
})
