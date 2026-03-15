import { createUIMessageStream, createUIMessageStreamResponse } from "ai"
import type { NormalizedCitation } from "@/lib/citations/types"

export function sanitizeMessagesForSearch<
  T extends { role: string; content: unknown }
>(msgs: T[]): T[] {
  return msgs
    .filter((m) => ["system", "user", "assistant"].includes(m.role))
    .map((m) => {
      if (m.role !== "assistant") return m
      if (!Array.isArray(m.content)) return m
      const textParts = (m.content as Array<{ type: string; text?: string }>)
        .filter(
          (p) =>
            typeof p === "object" &&
            p !== null &&
            "type" in p &&
            p.type === "text"
        )
        .filter(
          (p): p is { type: "text"; text: string } =>
            "text" in p && typeof p.text === "string"
        )
        .map((p) => p.text)
        .join("\n")
      if (!textParts) return null
      return { ...m, content: textParts } as T
    })
    .filter((m): m is T => m !== null)
}

function canonicalizeCitationUrl(raw: string): string {
  try {
    const u = new URL(raw)
    for (const key of Array.from(u.searchParams.keys())) {
      if (/^utm_/i.test(key)) u.searchParams.delete(key)
    }
    u.hash = ""
    const result = u.toString()
    return result.endsWith("/") ? result.slice(0, -1) : result
  } catch {
    return raw
  }
}

export function canonicalizeCitationUrls(
  citations: NormalizedCitation[]
): NormalizedCitation[] {
  return citations.map((c) => ({ ...c, url: canonicalizeCitationUrl(c.url) }))
}

export function createSearchUnavailableResponse(input: {
  errorMessage: string
}): Response {
  const messageId = globalThis.crypto?.randomUUID?.() ?? `${Date.now()}-${Math.random()}`
  const textId = globalThis.crypto?.randomUUID?.() ?? `${Date.now()}-${Math.random()}-text`
  const stream = createUIMessageStream({
    execute: ({ writer }) => {
      writer.write({ type: "start", messageId })
      writer.write({ type: "text-start", id: textId })
      writer.write({ type: "text-delta", id: textId, delta: input.errorMessage })
      writer.write({ type: "text-end", id: textId })
      writer.write({ type: "finish", finishReason: "error" })
    },
  })
  return createUIMessageStreamResponse({ stream })
}
