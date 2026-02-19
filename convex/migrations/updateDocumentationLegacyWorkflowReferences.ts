import { internalMutation } from "../_generated/server"

const replaceLegacyWorkflowTerms = (text: string): string => {
  return text
    .replaceAll("7 Fase Penulisan", "Workflow 13 Tahapan Penyusunan")
    .replaceAll("Kerangka tujuh fase", "Kerangka workflow 13 tahapan")
    .replaceAll(
      "tujuh fase akademik (dari penetapan topik hingga finalisasi)",
      "workflow 13 tahapan penyusunan (dari gagasan paper hingga pemilihan judul)"
    )
    .replaceAll(
      "Tujuh fase penulisan (dari pendefinisian topik hingga finalisasi)",
      "Workflow 13 tahapan penyusunan (dari gagasan paper hingga pemilihan judul)"
    )
    .replaceAll(
      "tujuh fase penulisan (dari pendefinisian topik hingga finalisasi)",
      "workflow 13 tahapan penyusunan (dari gagasan paper hingga pemilihan judul)"
    )
}

const deepReplaceStrings = <T>(value: T): T => {
  if (typeof value === "string") {
    return replaceLegacyWorkflowTerms(value) as T
  }

  if (Array.isArray(value)) {
    return value.map((item) => deepReplaceStrings(item)) as T
  }

  if (value && typeof value === "object") {
    const output: Record<string, unknown> = {}
    for (const [key, nested] of Object.entries(value)) {
      output[key] = deepReplaceStrings(nested)
    }
    return output as T
  }

  return value
}

const buildSearchText = (section: {
  title: string
  summary?: string
  blocks: Array<{
    type: "infoCard" | "ctaCards" | "section"
    title?: string
    description?: string
    items?: Array<
      | string
      | {
          title?: string
          description?: string
          ctaText?: string
          text?: string
          subItems?: string[]
        }
    >
    paragraphs?: string[]
    list?: {
      variant: "bullet" | "numbered"
      items: Array<{ text: string; subItems?: string[] }>
    }
  }>
}) => {
  const chunks: string[] = [section.title, section.summary ?? ""]

  for (const block of section.blocks) {
    if (block.type === "infoCard") {
      chunks.push(block.title ?? "", block.description ?? "")
      for (const item of block.items ?? []) {
        if (typeof item === "string") chunks.push(item)
      }
      continue
    }

    if (block.type === "ctaCards") {
      for (const item of block.items ?? []) {
        if (typeof item !== "string") {
          chunks.push(item.title ?? "", item.description ?? "", item.ctaText ?? "")
        }
      }
      continue
    }

    chunks.push(block.title ?? "", block.description ?? "")
    if (block.paragraphs) chunks.push(...block.paragraphs)
    if (block.list) {
      for (const item of block.list.items) {
        chunks.push(item.text)
        if (item.subItems) chunks.push(...item.subItems)
      }
    }
  }

  return chunks.join(" ").replace(/\s+/g, " ").trim()
}

export const updateLegacyWorkflowReferences = internalMutation({
  args: {},
  handler: async (ctx) => {
    const now = Date.now()
    const targetSlugs = ["welcome", "concepts"] as const
    const updated: Array<{ slug: string; sectionId: string }> = []

    for (const slug of targetSlugs) {
      const section = await ctx.db
        .query("documentationSections")
        .withIndex("by_slug", (q) => q.eq("slug", slug))
        .first()

      if (!section) continue

      const patchedSummary = section.summary
        ? replaceLegacyWorkflowTerms(section.summary)
        : undefined
      const patchedBlocks = deepReplaceStrings(section.blocks)

      await ctx.db.patch(section._id, {
        summary: patchedSummary,
        blocks: patchedBlocks,
        searchText: buildSearchText({
          title: section.title,
          summary: patchedSummary,
          blocks: patchedBlocks,
        }),
        updatedAt: now,
      })

      updated.push({ slug, sectionId: section._id })
    }

    return {
      success: true,
      updatedCount: updated.length,
      updated,
      message:
        "Referensi legacy 7 fase pada section welcome dan concepts berhasil diselaraskan ke workflow 13 tahapan.",
    }
  },
})
