import { internalMutation } from "../_generated/server"
import { TOP_UP_PACKAGES, CREDIT_PACKAGES } from "../billing/constants"

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

/**
 * Migration to update all pricing plans content to match mockup
 * Run via: npx convex run "migrations/seedPricingPlans:updatePricingContent"
 */
export const updatePricingContent = internalMutation({
  handler: async ({ db }) => {
    const now = Date.now()
    const updates: string[] = []

    // Update Gratis plan
    const gratisPlan = await db
      .query("pricingPlans")
      .filter((q) => q.eq(q.field("slug"), "gratis"))
      .first()

    if (gratisPlan) {
      await db.patch(gratisPlan._id, {
        price: "Rp0",
        unit: "/bulan",
        features: [
          "Menggunakan 13 tahap workflow",
          "Diskusi dan menyusun draft",
          "Pemakaian harian terbatas",
        ],
        ctaText: "Coba Sekarang",
        ctaHref: "/chat",
        updatedAt: now,
      })
      updates.push("Gratis updated")
    }

    // Update BPP plan
    const bppPlan = await db
      .query("pricingPlans")
      .filter((q) => q.eq(q.field("slug"), "bpp"))
      .first()

    if (bppPlan) {
      await db.patch(bppPlan._id, {
        name: "Bayar Per Paper",
        price: "Rp80rb",
        unit: "/paper",
        features: [
          "Bayar per paper ketika butuh",
          "Full 13 tahap workflow",
          "Draft hingga paper utuh",
          "Diskusi sesuai konteks paper",
          "Export Word & PDF",
        ],
        isDisabled: false,
        ctaText: "Pilih Paket",
        ctaHref: "/subscription/topup",
        updatedAt: now,
      })
      updates.push("BPP updated")
    }

    // Update Pro plan
    const proPlan = await db
      .query("pricingPlans")
      .filter((q) => q.eq(q.field("slug"), "pro"))
      .first()

    if (proPlan) {
      await db.patch(proPlan._id, {
        price: "Rp200rb",
        unit: "/bulan",
        features: [
          "Menyusun 5-6 Paper",
          "Full 13 tahap workflow",
          "Draft hingga paper utuh",
          "Diskusi tak terbatas",
          "Export Word & PDF",
        ],
        ctaText: "Langganan Pro",
        ctaHref: "/subscription/upgrade",
        updatedAt: now,
      })
      updates.push("Pro updated")
    }

    return {
      success: true,
      updates,
      message: `Updated ${updates.length} plans`,
    }
  },
})

/**
 * Migration to activate BPP Payment flow
 * Run via: npx convex run "migrations/seedPricingPlans:activateBPPPayment"
 *
 * This migration:
 * 1. Updates BPP plan: enabled, highlighted, adds topupOptions
 * 2. Updates Gratis plan: removes highlight
 * 3. Updates Pro plan: "Segera Hadir" text, stays disabled
 */
export const activateBPPPayment = internalMutation({
  handler: async ({ db }) => {
    const now = Date.now()
    const updates: string[] = []

    // Convert TOP_UP_PACKAGES to topupOptions format
    const topupOptions = TOP_UP_PACKAGES.map((pkg) => ({
      amount: pkg.amount,
      tokens: pkg.tokens,
      label: pkg.label,
      popular: "popular" in pkg ? pkg.popular : false,
    }))

    // Update Gratis plan: remove highlight
    const gratisPlan = await db
      .query("pricingPlans")
      .filter((q) => q.eq(q.field("slug"), "gratis"))
      .first()

    if (gratisPlan) {
      await db.patch(gratisPlan._id, {
        isHighlighted: false,
        updatedAt: now,
      })
      updates.push("Gratis: isHighlighted → false")
    }

    // Update BPP plan: enable, highlight, add topupOptions
    const bppPlan = await db
      .query("pricingPlans")
      .filter((q) => q.eq(q.field("slug"), "bpp"))
      .first()

    if (bppPlan) {
      await db.patch(bppPlan._id, {
        isDisabled: false,
        isHighlighted: true,
        ctaText: "Pilih Paket",
        ctaHref: "/subscription/plans",
        topupOptions,
        updatedAt: now,
      })
      updates.push("BPP: enabled, highlighted, topupOptions added, ctaHref → /subscription/plans")
    }

    // Update Pro plan: "Segera Hadir", stays disabled
    const proPlan = await db
      .query("pricingPlans")
      .filter((q) => q.eq(q.field("slug"), "pro"))
      .first()

    if (proPlan) {
      await db.patch(proPlan._id, {
        ctaText: "Segera Hadir",
        isDisabled: true,
        updatedAt: now,
      })
      updates.push("Pro: ctaText → 'Segera Hadir', stays disabled")
    }

    return {
      success: true,
      updates,
      topupOptions,
      message: `Activated BPP Payment. Updated ${updates.length} plans.`,
    }
  },
})

/**
 * Migration to add credit packages to BPP plan
 * Run via: npx convex run "migrations/seedPricingPlans:activateCreditPackages"
 */
export const activateCreditPackages = internalMutation({
  handler: async ({ db }) => {
    const now = Date.now()
    const updates: string[] = []

    // Convert CREDIT_PACKAGES to creditPackages format
    const creditPackages = CREDIT_PACKAGES.map((pkg) => ({
      type: pkg.type,
      credits: pkg.credits,
      tokens: pkg.tokens,
      priceIDR: pkg.priceIDR,
      label: pkg.label,
      description: pkg.description,
      ratePerCredit: pkg.ratePerCredit,
      popular: pkg.type === "paper",
    }))

    // Update BPP plan
    const bppPlan = await db
      .query("pricingPlans")
      .filter((q) => q.eq(q.field("slug"), "bpp"))
      .first()

    if (bppPlan) {
      await db.patch(bppPlan._id, {
        creditPackages,
        ctaText: "Beli Paket Paper",
        updatedAt: now,
      })
      updates.push("BPP: creditPackages added")
    }

    return {
      success: true,
      updates,
      creditPackages,
      message: `Activated credit packages. Updated ${updates.length} plans.`,
    }
  },
})

/**
 * Migration to update pricing plans content for redesigned pricing page
 * Run via: npx convex run "migrations/seedPricingPlans:updatePricingPageContent"
 */
export const updatePricingPageContent = internalMutation({
  handler: async ({ db }) => {
    const now = Date.now()
    const updates: string[] = []

    // Update Gratis plan
    const gratisPlan = await db
      .query("pricingPlans")
      .filter((q) => q.eq(q.field("slug"), "gratis"))
      .first()

    if (gratisPlan) {
      await db.patch(gratisPlan._id, {
        name: "Gratis",
        price: "Rp0",
        unit: undefined,
        tagline: "Cocok untuk mencoba workflow dan menyusun draft awal tanpa biaya.",
        features: [
          "Mendapat 50 kredit",
          "Brainstorming hingga draft",
          "Pencarian literatur terbatas",
        ],
        ctaText: "Coba",
        isHighlighted: false,
        isDisabled: false,
        ctaHref: "/chat",
        updatedAt: now,
      })
      updates.push("Gratis updated")
    }

    // Update BPP plan
    const bppPlan = await db
      .query("pricingPlans")
      .filter((q) => q.eq(q.field("slug"), "bpp"))
      .first()

    if (bppPlan) {
      await db.patch(bppPlan._id, {
        name: "Bayar Per Paper",
        price: "Rp80ribu",
        unit: "/paper",
        tagline: "Tepat untuk menyelesaikan satu paper utuh hingga ekspor Word/PDF.",
        features: [
          "Mendapat 300 kredit",
          "Menyusun 1 paper setara 15 halaman A4",
          "Diskusi sesuai topik paper",
          "Pencarian literatur sesuai kebutuhan paper",
          "Editing draft di tiap tahapan workflow",
          "Penggunaan tool refrasa untuk konversi ke bahasa manusiawi",
          "Ekspor ke .docx (word) & .pdf",
        ],
        ctaText: "Beli Kredit",
        isHighlighted: true,
        isDisabled: false,
        ctaHref: "/subscription/plans",
        updatedAt: now,
      })
      updates.push("BPP updated")
    }

    // Update Pro plan
    const proPlan = await db
      .query("pricingPlans")
      .filter((q) => q.eq(q.field("slug"), "pro"))
      .first()

    if (proPlan) {
      await db.patch(proPlan._id, {
        name: "Pro",
        price: "Rp200ribu",
        unit: "/bulan",
        tagline: "Ideal untuk penyusunan banyak paper",
        features: [
          "Mendapat 5000 kredit",
          "Menyusun 5-6 paper, dengan @paper setara 15 halaman A4",
          "Diskusi sepuasnya",
          "Pencarian literatur dengan frekuensi banyak",
          "Editing draft di tiap tahapan workflow",
          "Penggunaan tool refrasa untuk konversi ke bahasa manusiawi",
          "Ekspor ke .docx (word) & .pdf",
        ],
        ctaText: "Langganan",
        isHighlighted: false,
        isDisabled: true,
        ctaHref: "/subscription/upgrade",
        updatedAt: now,
      })
      updates.push("Pro updated")
    }

    return {
      success: true,
      updates,
      message: `Updated ${updates.length} pricing plans for redesigned page.`,
    }
  },
})

/**
 * Migration to add teaser-specific content fields
 * Run via: npx convex run "migrations/seedPricingPlans:addTeaserContent"
 */
export const addTeaserContent = internalMutation({
  handler: async ({ db }) => {
    const now = Date.now()
    const updates: string[] = []

    // Update Gratis plan
    const gratisPlan = await db
      .query("pricingPlans")
      .filter((q) => q.eq(q.field("slug"), "gratis"))
      .first()

    if (gratisPlan) {
      await db.patch(gratisPlan._id, {
        teaserDescription: "Cocok untuk mencoba 13 tahap workflow dan menyusun draft awal tanpa biaya.",
        teaserCreditNote: "Mendapat 50 kredit, untuk diskusi dan membentuk draft",
        updatedAt: now,
      })
      updates.push("Gratis teaser content added")
    }

    // Update BPP plan
    const bppPlan = await db
      .query("pricingPlans")
      .filter((q) => q.eq(q.field("slug"), "bpp"))
      .first()

    if (bppPlan) {
      await db.patch(bppPlan._id, {
        teaserDescription: "Tepat untuk menyelesaikan satu paper utuh hingga ekspor Word/PDF.",
        teaserCreditNote: "Mendapat 300 kredit, untuk menyusun 1 paper setara 15 halaman A4 dan diskusi kontekstual.",
        updatedAt: now,
      })
      updates.push("BPP teaser content added")
    }

    // Update Pro plan
    const proPlan = await db
      .query("pricingPlans")
      .filter((q) => q.eq(q.field("slug"), "pro"))
      .first()

    if (proPlan) {
      await db.patch(proPlan._id, {
        teaserDescription: "Ideal untuk penyusunan banyak paper dengan diskusi sepuasnya.",
        teaserCreditNote: "Mendapat 5000 kredit, untuk menyusun 5-6 paper setara @15 halaman dan diskusi mendalam",
        updatedAt: now,
      })
      updates.push("Pro teaser content added")
    }

    return {
      success: true,
      updates,
      message: `Added teaser content to ${updates.length} plans.`,
    }
  },
})

/**
 * Migration to enable Pro plan for all pricing surfaces.
 * Run via: npx convex run "migrations/seedPricingPlans:enableProPlan"
 */
export const enableProPlan = internalMutation({
  handler: async ({ db }) => {
    const now = Date.now()

    const proPlan = await db
      .query("pricingPlans")
      .filter((q) => q.eq(q.field("slug"), "pro"))
      .first()

    if (!proPlan) {
      return {
        success: false,
        message: "Plan 'pro' tidak ditemukan",
      }
    }

    await db.patch(proPlan._id, {
      isDisabled: false,
      ctaText: proPlan.ctaText || "Langganan",
      ctaHref: proPlan.ctaHref || "/subscription/upgrade",
      updatedAt: now,
    })

    return {
      success: true,
      message: "Plan Pro berhasil diaktifkan",
      planId: proPlan._id,
      previousState: {
        isDisabled: proPlan.isDisabled,
        ctaText: proPlan.ctaText,
        ctaHref: proPlan.ctaHref,
      },
      nextState: {
        isDisabled: false,
        ctaText: proPlan.ctaText || "Langganan",
        ctaHref: proPlan.ctaHref || "/subscription/upgrade",
      },
    }
  },
})

/**
 * Migration to normalize Pro plan credit copy to 5000 kredit across pricing surfaces.
 * Run via: npx convex run "migrations/seedPricingPlans:updateProCreditsTo5000"
 */
export const updateProCreditsTo5000 = internalMutation({
  handler: async ({ db }) => {
    const now = Date.now()

    const proPlan = await db
      .query("pricingPlans")
      .filter((q) => q.eq(q.field("slug"), "pro"))
      .first()

    if (!proPlan) {
      return {
        success: false,
        message: "Plan 'pro' tidak ditemukan",
      }
    }

    const nextFeatures = (proPlan.features ?? []).map((feature) =>
      feature.replace(/2000\s*kredit/gi, "5000 kredit")
    )

    const nextTeaserCreditNote = proPlan.teaserCreditNote
      ? proPlan.teaserCreditNote.replace(/2000\s*kredit/gi, "5000 kredit")
      : proPlan.teaserCreditNote

    await db.patch(proPlan._id, {
      features: nextFeatures,
      teaserCreditNote: nextTeaserCreditNote,
      updatedAt: now,
    })

    return {
      success: true,
      message: "Plan Pro berhasil diupdate ke 5000 kredit",
      planId: proPlan._id,
      previous: {
        features: proPlan.features,
        teaserCreditNote: proPlan.teaserCreditNote,
      },
      next: {
        features: nextFeatures,
        teaserCreditNote: nextTeaserCreditNote,
      },
    }
  },
})

/**
 * Migration to normalize BPP plan credit copy to 300 kredit.
 * Run via: npx convex run "migrations/seedPricingPlans:updateBppCreditsTo300"
 */
export const updateBppCreditsTo300 = internalMutation({
  handler: async ({ db }) => {
    const now = Date.now()

    const bppPlan = await db
      .query("pricingPlans")
      .filter((q) => q.eq(q.field("slug"), "bpp"))
      .first()

    if (!bppPlan) {
      return {
        success: false,
        message: "Plan 'bpp' tidak ditemukan",
      }
    }

    const nextFeatures = (bppPlan.features ?? []).map((feature) =>
      feature.replace(/100\s*kredit/gi, "300 kredit")
    )

    const nextTeaserCreditNote = bppPlan.teaserCreditNote
      ? bppPlan.teaserCreditNote.replace(/100\s*kredit/gi, "300 kredit")
      : bppPlan.teaserCreditNote

    await db.patch(bppPlan._id, {
      features: nextFeatures,
      teaserCreditNote: nextTeaserCreditNote,
      updatedAt: now,
    })

    return {
      success: true,
      message: "Plan BPP berhasil dinormalisasi ke 300 kredit",
      planId: bppPlan._id,
      previous: {
        features: bppPlan.features,
        teaserCreditNote: bppPlan.teaserCreditNote,
      },
      next: {
        features: nextFeatures,
        teaserCreditNote: nextTeaserCreditNote,
      },
    }
  },
})
