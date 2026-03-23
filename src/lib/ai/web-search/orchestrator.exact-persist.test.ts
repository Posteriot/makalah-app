import { describe, expect, it, vi } from "vitest"
import { fetchMutation } from "convex/nextjs"
import { persistExactSourceDocuments } from "./orchestrator"
import type { FetchedContent } from "./content-fetcher"

vi.mock("convex/nextjs", () => ({
  fetchMutation: vi.fn(),
}))

function createFetchedContent(
  overrides: Partial<FetchedContent> = {}
): FetchedContent {
  return {
    url: "https://example.com/original",
    resolvedUrl: "https://example.com/resolved",
    rawTitle: "Judul Mentah",
    title: "Judul Artikel",
    author: "Penulis",
    publishedAt: "2026-03-24",
    siteName: "Contoh Media",
    documentKind: "html",
    exactMetadataAvailable: true,
    paragraphs: [{ index: 1, text: "Paragraf pertama" }],
    documentText: "Paragraf pertama",
    pageContent: "Paragraf pertama",
    fullContent: "Paragraf pertama",
    fetchMethod: "fetch",
    ...overrides,
  }
}

describe("persistExactSourceDocuments", () => {
  it("waits for exact-source mutations before resolving", async () => {
    let releaseFirstPersist: (() => void) | null = null

    vi.mocked(fetchMutation).mockImplementation(
      async (...callArgs) => {
        const args = callArgs[1] as { resolvedUrl?: string } | undefined
        if (args?.resolvedUrl === "https://example.com/resolved-1") {
          await new Promise<void>((resolve) => {
            releaseFirstPersist = resolve
          })
        }

        return null as never
      }
    )

    const persistPromise = persistExactSourceDocuments({
      fetchedContent: [
        createFetchedContent({
          resolvedUrl: "https://example.com/resolved-1",
        }),
        createFetchedContent({
          url: "https://example.com/original-2",
          resolvedUrl: "https://example.com/resolved-2",
        }),
      ],
      conversationId: "conv_1" as never,
    })

    let settled = false
    void persistPromise.then(() => {
      settled = true
    })

    await Promise.resolve()
    await Promise.resolve()

    expect(settled).toBe(false)
    expect(fetchMutation).toHaveBeenCalledTimes(1)

    if (!releaseFirstPersist) {
      throw new Error("first persist release handler was not captured")
    }
    const release: () => void = releaseFirstPersist
    release()
    await persistPromise

    expect(fetchMutation).toHaveBeenCalledTimes(2)
    expect(settled).toBe(true)
  })

  it("persists documentKind into sourceDocuments inventory", async () => {
    vi.mocked(fetchMutation).mockResolvedValue(null as never)

    await persistExactSourceDocuments({
      fetchedContent: [createFetchedContent({ documentKind: "html" })],
      conversationId: "conv_1" as never,
    })

    expect(fetchMutation).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({
        documentKind: "html",
      }),
      undefined
    )
  })
})
