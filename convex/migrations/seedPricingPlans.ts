import { internalMutation } from "../_generated/server"

/**
 * Migration script to seed default pricing plans for marketing page
 * Run via: npx convex run migrations:seedPricingPlans
 *
 * ============================================================================
 * IMPORTANT NOTES:
 * ============================================================================
 *
 * 1. INITIAL BOOTSTRAP ONLY
 *    - This migration is ONLY for fresh database installs or first-time setup
 *    - The guard prevents re-running if any pricing plans exist
 *    - Subsequent updates should be done via Admin Panel (future feature)
 *
 * 2. PRICING DATA SOURCE
 *    - Based on: .development/ui-mockup/html-css/home-mockup.html lines 485-577
 *    - 3 plans: Gratis (highlighted), Bayar Per Tugas (disabled), Pro (disabled)
 *
 * ============================================================================
 */

// Default pricing plans data based on mockup
const DEFAULT_PRICING_PLANS = [
  {
    name: "Gratis",
    slug: "gratis",
    price: "Rp.0",
    priceValue: 0,
    unit: undefined,
    tagline: "Akses awal tanpa biaya untuk mengenal alur Makalah AI.",
    features: [
      "Eksplorasi alur penyunan hingga draft.",
      "Upgrade kapan saja lewat halaman harga.",
    ],
    isHighlighted: true,
    isDisabled: false,
    ctaText: "Coba Gratis",
    ctaHref: "/auth",
    sortOrder: 1,
  },
  {
    name: "Bayar Per Tugas",
    slug: "bpp",
    price: "Rpxx.xxx",
    priceValue: undefined, // Price TBD
    unit: "per paper",
    tagline: "Bayar sesuai kebutuhan untuk menyelesaikan satu paper setara 15 halaman A4.",
    features: [
      "Selesaikan satu makalah lengkap.",
      "Bayar hanya saat ada tugas saja.",
    ],
    isHighlighted: false,
    isDisabled: true,
    ctaText: "Belum Aktif",
    ctaHref: undefined,
    sortOrder: 2,
  },
  {
    name: "Pro",
    slug: "pro",
    price: "Rpxxx.xxx",
    priceValue: undefined, // Price TBD
    unit: "per bulan",
    tagline: "Langganan untuk penyusunan banyak paper akademik per bulan dengan diskusi agent tanpa batas.",
    features: [
      "Penyusunan hingga enam paper.",
      "Diskusi agent tanpa batas.",
      "Dukungan operasional prioritas.",
    ],
    isHighlighted: false,
    isDisabled: true,
    ctaText: "Belum Aktif",
    ctaHref: undefined,
    sortOrder: 3,
  },
]

export const seedPricingPlans = internalMutation({
  handler: async ({ db }) => {
    // Check if any pricing plans exist
    const existing = await db.query("pricingPlans").first()
    if (existing) {
      return {
        success: false,
        message: "Pricing plans sudah ada. Migration dibatalkan.",
      }
    }

    const now = Date.now()
    const insertedIds: string[] = []

    // Insert all pricing plans
    for (const plan of DEFAULT_PRICING_PLANS) {
      const planId = await db.insert("pricingPlans", {
        ...plan,
        createdAt: now,
        updatedAt: now,
      })
      insertedIds.push(planId)
    }

    return {
      success: true,
      insertedCount: insertedIds.length,
      message: `${insertedIds.length} pricing plans berhasil dibuat.`,
    }
  },
})

/**
 * Migration to update highlighted plan from Gratis to BPP
 * Run via: npx convex run migrations:updateHighlightedPlan
 */
export const updateHighlightedPlan = internalMutation({
  handler: async ({ db }) => {
    const now = Date.now()
    const updates: string[] = []

    // Find Gratis plan and set isHighlighted to false
    const gratisPlan = await db
      .query("pricingPlans")
      .filter((q) => q.eq(q.field("slug"), "gratis"))
      .first()

    if (gratisPlan && gratisPlan.isHighlighted) {
      await db.patch(gratisPlan._id, {
        isHighlighted: false,
        updatedAt: now,
      })
      updates.push("Gratis: isHighlighted → false")
    }

    // Find BPP plan and set isHighlighted to true
    const bppPlan = await db
      .query("pricingPlans")
      .filter((q) => q.eq(q.field("slug"), "bpp"))
      .first()

    if (bppPlan && !bppPlan.isHighlighted) {
      await db.patch(bppPlan._id, {
        isHighlighted: true,
        updatedAt: now,
      })
      updates.push("BPP: isHighlighted → true")
    }

    return {
      success: true,
      updates,
      message: updates.length > 0
        ? `Updated ${updates.length} plans: ${updates.join(", ")}`
        : "No changes needed",
    }
  },
})
