import { internalMutationGeneric } from "convex/server"

/**
 * Migration: Seed siteConfig table with header and footer data
 *
 * Run with: npx convex run migrations:seedSiteConfig
 *
 * Extracts current hardcoded values from GlobalHeader.tsx and Footer.tsx
 * into the database-driven siteConfig table.
 *
 * Idempotent: skips insert if key already exists.
 */
export const seedSiteConfig = internalMutationGeneric({
  args: {},
  handler: async ({ db }) => {
    console.log("[Migration] Starting seedSiteConfig...")

    const now = Date.now()
    const results: { key: string; status: string; id?: string }[] = []

    // ========================================================================
    // 1. Header config
    // ========================================================================
    const existingHeader = await db
      .query("siteConfig")
      .withIndex("by_key", (q: any) => q.eq("key", "header"))
      .first()

    if (existingHeader) {
      console.log('[Migration] Header config already exists, skipping')
      results.push({ key: "header", status: "skipped" })
    } else {
      const headerId = await db.insert("siteConfig", {
        key: "header",
        navLinks: [
          { label: "Harga", href: "/pricing", isVisible: true },
          { label: "Chat", href: "/chat", isVisible: true },
          { label: "Blog", href: "/blog", isVisible: true },
          { label: "Dokumentasi", href: "/documentation", isVisible: true },
          { label: "Tentang", href: "/about", isVisible: true },
        ],
        updatedAt: now,
      })
      console.log(`[Migration] Header config created: ${headerId}`)
      results.push({ key: "header", status: "created", id: String(headerId) })
    }

    // ========================================================================
    // 2. Footer config
    // ========================================================================
    const existingFooter = await db
      .query("siteConfig")
      .withIndex("by_key", (q: any) => q.eq("key", "footer"))
      .first()

    if (existingFooter) {
      console.log('[Migration] Footer config already exists, skipping')
      results.push({ key: "footer", status: "skipped" })
    } else {
      const footerId = await db.insert("siteConfig", {
        key: "footer",
        footerSections: [
          {
            title: "Sumber Daya",
            links: [
              { label: "Blog", href: "/blog" },
              { label: "Dokumentasi", href: "/documentation" },
              { label: "Kerja Sama Bisnis", href: "/about#kontak" },
            ],
          },
          {
            title: "Perusahaan",
            links: [
              { label: "Karier", href: "/about#bergabung-dengan-tim" },
              { label: "Tentang kami", href: "/about" },
            ],
          },
          {
            title: "Legal",
            links: [
              { label: "Privacy", href: "/privacy" },
              { label: "Security", href: "/security" },
              { label: "Terms", href: "/terms" },
            ],
          },
        ],
        socialLinks: [
          { platform: "x", url: "#", isVisible: true },
          { platform: "linkedin", url: "#", isVisible: true },
          { platform: "instagram", url: "#", isVisible: true },
        ],
        copyrightText: "\u00a9 {year} Makalah AI. Hak cipta dilindungi.",
        updatedAt: now,
      })
      console.log(`[Migration] Footer config created: ${footerId}`)
      results.push({ key: "footer", status: "created", id: String(footerId) })
    }

    console.log("[Migration] seedSiteConfig complete:", JSON.stringify(results))

    return {
      success: true,
      results,
    }
  },
})
