import { query } from "./_generated/server"

export const getPublishedSections = query({
  args: {},
  handler: async (ctx) => {
    return ctx.db
      .query("documentationSections")
      .withIndex("by_published", (q) => q.eq("isPublished", true))
      .collect()
  },
})
