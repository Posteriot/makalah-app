import { internalMutationGeneric } from "convex/server"

/**
 * Migration: Seed richTextPages table with placeholder records
 *
 * Run with: npx convex run migrations:seedRichTextPages
 *
 * Creates 4 policy/info page records (about, privacy, security, terms)
 * with minimal TipTap placeholder content. Actual content will be
 * entered via TipTap editor in the admin panel.
 *
 * Idempotent: skips insert if slug already exists.
 */
export const seedRichTextPages = internalMutationGeneric({
  args: {},
  handler: async ({ db }) => {
    console.log("[Migration] Starting seedRichTextPages...")

    const now = Date.now()
    const results: { slug: string; status: string; id?: string }[] = []

    const placeholderContent = JSON.stringify({
      type: "doc",
      content: [
        {
          type: "paragraph",
          content: [{ type: "text", text: "Konten akan segera diperbarui." }],
        },
      ],
    })

    const pages = [
      { slug: "about", title: "Tentang Makalah AI" },
      { slug: "privacy", title: "Kebijakan Privasi Makalah AI" },
      { slug: "security", title: "Keamanan Makalah AI" },
      { slug: "terms", title: "Syarat dan Ketentuan Makalah AI" },
    ] as const

    for (const page of pages) {
      const existing = await db
        .query("richTextPages")
        .withIndex("by_slug", (q: any) => q.eq("slug", page.slug))
        .first()

      if (existing) {
        console.log(
          `[Migration] Page "${page.slug}" already exists, skipping`
        )
        results.push({ slug: page.slug, status: "skipped" })
      } else {
        const id = await db.insert("richTextPages", {
          slug: page.slug,
          title: page.title,
          content: placeholderContent,
          isPublished: false,
          updatedAt: now,
        })
        console.log(`[Migration] Page "${page.slug}" created: ${id}`)
        results.push({ slug: page.slug, status: "created", id: String(id) })
      }
    }

    console.log(
      "[Migration] seedRichTextPages complete:",
      JSON.stringify(results)
    )

    return {
      success: true,
      results,
    }
  },
})
