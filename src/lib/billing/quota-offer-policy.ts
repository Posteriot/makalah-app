import type { EffectiveTier } from "@/lib/utils/subscription"

export type QuotaOfferContext = "banner" | "chat_error"
export type QuotaVisualState = "warning" | "critical" | "depleted"
export type QuotaBlockReason =
  | "monthly_limit"
  | "insufficient_credit"
  | "paper_limit"
  | "daily_limit"
  | string

export interface QuotaOfferCta {
  label: string
  href: string
}

export interface QuotaOfferInput {
  tier: EffectiveTier
  context: QuotaOfferContext
  visualState: QuotaVisualState
  quotaReason?: QuotaBlockReason
}

export interface QuotaOfferResult {
  message: string
  primaryCta: QuotaOfferCta
  secondaryCta?: QuotaOfferCta
}

const HARD_BLOCK_REASONS = new Set<QuotaBlockReason>([
  "monthly_limit",
  "insufficient_credit",
  "paper_limit",
])

function normalizeTier(tier: EffectiveTier): "gratis" | "bpp" | "pro" {
  if (tier === "bpp" || tier === "pro") return tier
  return "gratis"
}

function resolveVisualState(input: QuotaOfferInput): QuotaVisualState {
  if (input.context !== "chat_error") return input.visualState
  if (!input.quotaReason) return input.visualState
  if (HARD_BLOCK_REASONS.has(input.quotaReason)) return "depleted"
  return input.visualState
}

export function resolveQuotaOffer(input: QuotaOfferInput): QuotaOfferResult {
  const tier = normalizeTier(input.tier)
  const visualState = resolveVisualState(input)

  if (visualState === "depleted") {
    if (tier === "gratis") {
      return {
        message:
          input.context === "chat_error"
            ? "Permintaan ditolak: kuota gratis tidak mencukupi."
            : "Kuota habis. Pilih beli kredit atau upgrade ke Pro untuk melanjutkan.",
        primaryCta: {
          label: "Beli Kredit",
          href: "/checkout/bpp",
        },
        secondaryCta: {
          label: "Upgrade ke Pro",
          href: "/checkout/pro",
        },
      }
    }

    if (tier === "bpp") {
      return {
        message:
          input.context === "chat_error"
            ? "Permintaan ditolak: kredit tidak mencukupi."
            : "Kredit habis. Beli kredit atau upgrade ke Pro untuk melanjutkan.",
        primaryCta: {
          label: "Beli Kredit",
          href: "/checkout/bpp",
        },
        secondaryCta: {
          label: "Upgrade ke Pro",
          href: "/checkout/pro",
        },
      }
    }

    return {
      message:
        input.context === "chat_error"
          ? "Permintaan ditolak: kuota/kredit tidak mencukupi."
          : "Kuota/kredit Pro tidak mencukupi. Beli kredit untuk melanjutkan.",
      primaryCta: {
        label: "Beli Kredit",
        href: "/checkout/bpp",
      },
    }
  }

  if (tier === "gratis") {
    return {
      message: "Kuota hampir habis. Lihat opsi paket agar proses tidak terhenti.",
      primaryCta: {
        label: "Lihat Opsi",
        href: "/subscription/overview",
      },
    }
  }

  return {
    message: "Kredit hampir habis. Beli kredit untuk menjaga kelancaran proses.",
    primaryCta: {
      label: "Beli Kredit",
      href: "/checkout/bpp",
    },
  }
}
