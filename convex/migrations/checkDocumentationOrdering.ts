import { internalQuery } from "../_generated/server"

const TARGET_SLUGS = [
  "welcome",
  "chat-agent",
  "workflow",
  "refrasa",
  "langganan",
  "tier",
  "pembayaran",
  "security",
  "privacy-policy",
  "terms",
]

export const checkDocumentationOrdering = internalQuery({
  args: {},
  handler: async (ctx) => {
    const rows: Array<{ slug: string; group: string; order: number }> = []

    for (const slug of TARGET_SLUGS) {
      const section = await ctx.db
        .query("documentationSections")
        .withIndex("by_slug", (q) => q.eq("slug", slug))
        .first()

      if (section) {
        rows.push({
          slug: section.slug,
          group: section.group,
          order: section.order,
        })
      }
    }

    return rows.sort((a, b) => a.order - b.order)
  },
})
