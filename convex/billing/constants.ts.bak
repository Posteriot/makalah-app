/**
 * Billing Constants
 * Tier limits, pricing, dan config untuk subscription system
 *
 * PENTING: Nilai di sini HARUS sinkron dengan data di tabel `pricingPlans`
 * yang ditampilkan di halaman marketing (/pricing) dan homepage.
 *
 * Pricing tiers (sinkron dengan pricingPlans DB):
 * - Gratis: Rp 0/bulan, pemakaian harian terbatas
 * - BPP (Bayar Per Paper): Mulai Rp 80.000/paper (~800K tokens)
 * - Pro: Rp 200.000/bulan, menyusun 5-6 paper
 */

// Token pricing (based on Gemini 2.5 Flash)
// Input: $0.075/1M = Rp 1.20/1K tokens
// Output: $0.30/1M = Rp 4.80/1K tokens
// Blended average: ~Rp 3/1K tokens
export const TOKEN_PRICE_PER_1K_IDR = 3

// Credit conversion rate
// Rp 1 = 10 tokens (simplified for UX)
// Rp 25,000 = 250,000 tokens
export const TOKENS_PER_IDR = 10

// BPP per-paper estimate (sinkron dengan pricingPlans: "Mulai Rp80rb/paper")
// 1 paper (~15 halaman A4) ≈ 800,000 tokens
// Rp 80,000 × 10 tokens/Rp = 800,000 tokens
export const BPP_PAPER_TOKENS_ESTIMATE = 800_000
export const BPP_PAPER_PRICE_IDR = 80_000

// Tier limits configuration
export const TIER_LIMITS = {
  gratis: {
    // Sinkron dengan pricingPlans: "Pemakaian harian terbatas"
    monthlyTokens: 100_000,
    dailyTokens: 50_000,
    monthlyPapers: 2,
    hardLimit: true, // Block saat quota habis
    overageAllowed: false,
    creditBased: false,
  },
  bpp: {
    // Sinkron dengan pricingPlans: "Bayar per paper ketika butuh"
    // Credit-based, tidak ada limit bulanan
    monthlyTokens: Infinity,
    dailyTokens: Infinity,
    monthlyPapers: Infinity,
    hardLimit: false,
    overageAllowed: false,
    creditBased: true,
  },
  pro: {
    // Sinkron dengan pricingPlans: "Menyusun 5-6 Paper" per bulan
    // 5-6 paper × 800K tokens = 4M-4.8M tokens, dibulatkan ke 5M
    monthlyTokens: 5_000_000,
    dailyTokens: 200_000,
    monthlyPapers: Infinity,
    hardLimit: false,
    overageAllowed: true,
    overageRatePerToken: 0.00005, // Rp 0.05/1K = Rp 50/1M tokens
    creditBased: false,
  },
} as const

export type TierType = keyof typeof TIER_LIMITS

// Top-up package options
export const TOP_UP_PACKAGES = [
  { amount: 25_000, tokens: 250_000, label: "Rp 25.000" },
  { amount: 50_000, tokens: 500_000, label: "Rp 50.000", popular: true },
  { amount: 100_000, tokens: 1_000_000, label: "Rp 100.000" },
] as const

// Subscription pricing (sinkron dengan pricingPlans: Pro = Rp200rb/bulan)
export const SUBSCRIPTION_PRICING = {
  pro_monthly: {
    priceIDR: 200_000,
    intervalMonths: 1,
    label: "Pro Bulanan",
  },
  pro_yearly: {
    priceIDR: 2_000_000, // 10 bulan, hemat 2 bulan
    intervalMonths: 12,
    label: "Pro Tahunan (Hemat 2 bulan)",
  },
} as const

// Quota warning thresholds (percentage remaining)
export const QUOTA_WARNING_THRESHOLDS = {
  warning: 20, // Show warning at 20% remaining
  critical: 10, // Show critical at 10% remaining
  blocked: 0, // Block at 0%
} as const

// Operation type cost multipliers (for estimation)
export const OPERATION_COST_MULTIPLIERS = {
  chat_message: 1.0, // Base rate
  paper_generation: 1.5, // Paper tends to use more tokens
  web_search: 2.0, // Web search includes search results in context
  refrasa: 0.8, // Refrasa typically shorter
} as const

/**
 * Helper: Calculate cost from tokens
 */
export function calculateCostIDR(totalTokens: number): number {
  return Math.ceil((totalTokens / 1000) * TOKEN_PRICE_PER_1K_IDR)
}

/**
 * Helper: Calculate tokens from IDR amount
 */
export function calculateTokensFromIDR(amountIDR: number): number {
  return amountIDR * TOKENS_PER_IDR
}

/**
 * Helper: Get tier limits for a user tier
 */
export function getTierLimits(tier: string) {
  const normalizedTier = tier === "free" ? "gratis" : tier
  return TIER_LIMITS[normalizedTier as TierType] ?? TIER_LIMITS.gratis
}

/**
 * Helper: Get period boundaries (monthly billing cycle)
 * Period starts on user signup date anniversary
 */
export function getPeriodBoundaries(
  referenceDate: number, // User's signup date
  currentDate: number = Date.now()
): { periodStart: number; periodEnd: number } {
  const ref = new Date(referenceDate)
  const now = new Date(currentDate)

  // Get the day of month for anniversary
  const anniversaryDay = ref.getDate()

  // Calculate current period start
  const periodStart = new Date(now.getFullYear(), now.getMonth(), anniversaryDay)

  // If we haven't reached anniversary this month, go back one month
  if (periodStart > now) {
    periodStart.setMonth(periodStart.getMonth() - 1)
  }

  // Period end is one month after start
  const periodEnd = new Date(periodStart)
  periodEnd.setMonth(periodEnd.getMonth() + 1)

  return {
    periodStart: periodStart.getTime(),
    periodEnd: periodEnd.getTime(),
  }
}

/**
 * Helper: Check if date is in current day (for daily reset)
 */
export function isSameDay(timestamp1: number, timestamp2: number): boolean {
  const d1 = new Date(timestamp1)
  const d2 = new Date(timestamp2)
  return (
    d1.getFullYear() === d2.getFullYear() &&
    d1.getMonth() === d2.getMonth() &&
    d1.getDate() === d2.getDate()
  )
}
