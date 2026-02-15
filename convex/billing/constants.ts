/**
 * Billing Constants
 * Tier limits, pricing, dan config untuk subscription system
 *
 * PENTING: Nilai di sini HARUS sinkron dengan data di tabel `pricingPlans`
 * yang ditampilkan di halaman marketing (/pricing) dan homepage.
 *
 * Pricing tiers (sinkron dengan pricingPlans DB):
 * - Gratis: Rp 0/bulan, pemakaian harian terbatas
 * - BPP (Bayar Per Paper): Mulai Rp 80.000/paper (300 kredit = 300K tokens)
 * - Pro: Rp 200.000/bulan, menyusun 5-6 paper
 */

// ════════════════════════════════════════════════════════════════
// Credit System (1 kredit = 1.000 tokens)
// ════════════════════════════════════════════════════════════════

// Credit conversion rate
export const TOKENS_PER_CREDIT = 1_000

// Paper soft cap
export const PAPER_CREDITS = 300
export const PAPER_TOKENS = 300_000 // 300 kredit × 1.000 tokens
export const PAPER_PRICE_IDR = 80_000

// Credit packages (satu-satunya paket: 300 kredit paper @ Rp 80.000)
export const CREDIT_PACKAGES = [
  {
    type: "paper" as const,
    credits: 300,
    tokens: 300_000,
    priceIDR: 80_000,
    label: "Paket Paper",
    description: "1 paper lengkap (~15 halaman)",
    ratePerCredit: 267, // Rp 80.000 / 300 kredit
  },
] as const

export type CreditPackageType = (typeof CREDIT_PACKAGES)[number]["type"]

// ════════════════════════════════════════════════════════════════
// Credit Helper Functions
// ════════════════════════════════════════════════════════════════

/**
 * Convert tokens to credits (ceiling)
 */
export function tokensToCredits(tokens: number): number {
  return Math.ceil(tokens / TOKENS_PER_CREDIT)
}

/**
 * Convert credits to tokens
 */
export function creditsToTokens(credits: number): number {
  return credits * TOKENS_PER_CREDIT
}

/**
 * Get package by type
 */
export function getPackageByType(type: CreditPackageType) {
  return CREDIT_PACKAGES.find((p) => p.type === type)
}

/**
 * Validate package type
 */
export function isValidPackageType(type: string): type is CreditPackageType {
  return CREDIT_PACKAGES.some((p) => p.type === type)
}

// ════════════════════════════════════════════════════════════════
// Token pricing untuk cost tracking (dipakai oleh usage.ts)
// HARUS TETAP ADA - jangan hapus!
//
// Estimasi PRIMARY (Gemini 2.5 Flash) saja:
// Input: $0.30/1M = Rp 4.80/1K tokens
// Output: $2.50/1M = Rp 40.00/1K tokens
// Blended average (50:50) = Rp 22,40/1K tokens
// Catatan: fallback (GPT-5.1) lebih mahal, tidak dihitung di sini
// ════════════════════════════════════════════════════════════════
export const TOKEN_PRICE_PER_1K_IDR = 22.4

/**
 * Helper: Calculate cost from tokens
 * PENTING: Dipakai oleh usage.ts untuk cost tracking di usageEvents table
 */
export function calculateCostIDR(totalTokens: number): number {
  return Math.ceil((totalTokens / 1000) * TOKEN_PRICE_PER_1K_IDR)
}

// ════════════════════════════════════════════════════════════════
// DEPRECATED - Legacy constants (remove after migration complete)
// ════════════════════════════════════════════════════════════════

/** @deprecated Use TOKENS_PER_CREDIT instead */
export const TOKENS_PER_IDR = 10

/** @deprecated Use PAPER_TOKENS instead */
export const BPP_PAPER_TOKENS_ESTIMATE = 800_000

/** @deprecated Use PAPER_PRICE_IDR instead */
export const BPP_PAPER_PRICE_IDR = 80_000

/** @deprecated Use CREDIT_PACKAGES instead */
export const TOP_UP_PACKAGES = [
  { amount: 25_000, tokens: 250_000, label: "Rp 25.000" },
  { amount: 50_000, tokens: 500_000, label: "Rp 50.000", popular: true },
  { amount: 100_000, tokens: 1_000_000, label: "Rp 100.000" },
] as const

// ════════════════════════════════════════════════════════════════
// Tier Limits Configuration
// ════════════════════════════════════════════════════════════════

export const TIER_LIMITS = {
  gratis: {
    // 100 kredit/bulan, tanpa limit harian — pakai kapan saja selama masih ada
    monthlyTokens: 100_000,
    dailyTokens: Infinity,
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
    // Per paper: ~300K kredit (soft cap) + ~500K-700K untuk eksplorasi/riset/diskusi ≈ 800K-1M total
    // 5-6 paper × ~800K-1M tokens = 4M-6M tokens, dibulatkan ke 5M
    monthlyTokens: 5_000_000,
    dailyTokens: Infinity,
    monthlyPapers: Infinity,
    hardLimit: true, // Block saat quota habis (sama seperti Gratis)
    overageAllowed: false,
    creditBased: false,
  },
  unlimited: {
    // Admin/superadmin — no limits, no billing
    monthlyTokens: Infinity,
    dailyTokens: Infinity,
    monthlyPapers: Infinity,
    hardLimit: false,
    overageAllowed: false,
    creditBased: false,
  },
} as const

export type TierType = keyof typeof TIER_LIMITS

// ════════════════════════════════════════════════════════════════
// Subscription Pricing
// ════════════════════════════════════════════════════════════════

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

// ════════════════════════════════════════════════════════════════
// Quota Warning Thresholds
// ════════════════════════════════════════════════════════════════

// Quota warning thresholds (percentage remaining)
export const QUOTA_WARNING_THRESHOLDS = {
  warning: 20, // Show warning at 20% remaining
  critical: 10, // Show critical at 10% remaining
  blocked: 0, // Block at 0%
} as const

// ════════════════════════════════════════════════════════════════
// Operation Cost Multipliers
// ════════════════════════════════════════════════════════════════

// Operation type cost multipliers (for estimation)
export const OPERATION_COST_MULTIPLIERS = {
  chat_message: 1.0, // Base rate
  paper_generation: 1.5, // Paper tends to use more tokens
  web_search: 2.0, // Web search includes search results in context
  refrasa: 0.8, // Refrasa typically shorter
} as const

// ════════════════════════════════════════════════════════════════
// Helper Functions
// ════════════════════════════════════════════════════════════════

/**
 * Helper: Calculate tokens from IDR amount
 * @deprecated Use credit system instead
 */
export function calculateTokensFromIDR(amountIDR: number): number {
  return amountIDR * TOKENS_PER_IDR
}

/**
 * Helper: Get tier limits for a user tier
 */
export function getTierLimits(tier: string) {
  if (tier === "unlimited") return TIER_LIMITS.unlimited
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
