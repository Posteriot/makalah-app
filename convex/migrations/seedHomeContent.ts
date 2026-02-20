import { internalMutation } from "../_generated/server"

/**
 * Migration: Seed home page content into pageContent table
 *
 * Run with: npx convex run migrations/seedHomeContent
 *
 * Seeds 4 records for home page sections with current hardcoded text values.
 * All records created with isPublished: false — static fallback stays active
 * until admin publishes via CMS panel.
 *
 * Idempotent: skips if any pageContent records for "home" already exist.
 */

// ── Extracted text content from marketing components ─────────────────────

const HERO_CONTENT = {
  pageSlug: "home",
  sectionSlug: "hero",
  sectionType: "hero" as const,
  title: "Makalah AI \u2013 Ngobrol+Riset+Brainstorming=Paper_Akademik",
  subtitle:
    "Nggak perlu prompt & workflow ruwet. Gagasan apa saja bakal diolah Agen Makalah menjadi paper utuh",
  badgeText: "Anda Pawang, Ai Tukang",
  ctaText: "AYO MULAI",
  ctaHref: "/sign-up",
  isPublished: false,
  sortOrder: 1,
}

const BENEFITS_CONTENT = {
  pageSlug: "home",
  sectionSlug: "benefits",
  sectionType: "benefits" as const,
  items: [
    {
      title: "Sparring Partner",
      description:
        "Pendamping penulisan riset sekaligus mitra diskusi, dari tahap ide hingga paper jadi. Alat kolaboratif yang memastikan setiap karya akuntabel dan berkualitas akademik.",
    },
    {
      title: "Chat Natural",
      description:
        "Ngobrol saja, layaknya percakapan lazim. Tanggapi setiap respons maupun pertanyaan agent menggunakan Bahasa Indonesia sehari-hari, tanpa prompt rumit.",
    },
    {
      title: "Bahasa Manusiawi",
      description:
        'Gunakan fitur "Refrasa" untuk membentuk gaya penulisan bahasa Indonesia manusiawi, bukan khas robot, tanpa mengubah makna\u2014ritme paragraf, variasi kalimat, dan istilah jadi rapi.',
    },
    {
      title: "Dipandu Bertahap",
      description:
        "Workflow ketat dan terstruktur, mengolah ide hingga paper jadi, dengan sitasi kredibel dan format sesuai preferensi.",
    },
  ],
  isPublished: false,
  sortOrder: 2,
}

const WORKFLOW_FEATURE_CONTENT = {
  pageSlug: "home",
  sectionSlug: "features-workflow",
  sectionType: "feature-showcase" as const,
  badgeText: "Fitur",
  title: "Pagar ketat di tiap tahap penyusunan",
  description:
    "Workflow dalam Makalah Ai, akan menjadi pengawal ketat selama penyusunan paper. Konteks terjaga, tidak melenceng, percakapan apapun berujung pada output paper.",
  isPublished: false,
  sortOrder: 3,
}

const REFRASA_FEATURE_CONTENT = {
  pageSlug: "home",
  sectionSlug: "features-refrasa",
  sectionType: "feature-showcase" as const,
  badgeText: "Fitur",
  title: "Konversi pembahasaan menjadi Manusiawi",
  description:
    "Sekali klik fitur refrasa, maka tatanan kalimat dan nuansa yang semula bergaya robot dan seragam ala AI, langsung terkonversi menjadi pembahasaan manusiawi.",
  isPublished: false,
  sortOrder: 4,
}

// ── Migration function ───────────────────────────────────────────────────

export const seedHomeContent = internalMutation({
  handler: async ({ db }) => {
    console.log("[Migration] Starting seedHomeContent...")

    // Idempotent guard: check if any home page content already exists
    const existing = await db
      .query("pageContent")
      .withIndex("by_page", (q) => q.eq("pageSlug", "home"))
      .first()

    if (existing) {
      console.log("[Migration] Home page content already exists, skipping seed")
      return {
        success: false,
        message: "Home page content sudah ada. Migration dibatalkan.",
      }
    }

    const now = Date.now()
    const insertedIds: string[] = []

    // Insert all 4 sections
    const sections = [
      HERO_CONTENT,
      BENEFITS_CONTENT,
      WORKFLOW_FEATURE_CONTENT,
      REFRASA_FEATURE_CONTENT,
    ]

    for (const section of sections) {
      const id = await db.insert("pageContent", {
        ...section,
        updatedAt: now,
      })
      insertedIds.push(id)
      console.log(
        `[Migration] Inserted ${section.sectionSlug} (sortOrder: ${section.sortOrder})`
      )
    }

    console.log(
      `[Migration] Success! Inserted ${insertedIds.length} home page sections`
    )

    return {
      success: true,
      insertedCount: insertedIds.length,
      message: `${insertedIds.length} home page sections berhasil dibuat.`,
    }
  },
})
