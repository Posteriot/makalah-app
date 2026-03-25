import { describe, expect, it } from "vitest"
import {
  buildReferencePresentationSources,
  inferSearchResponseMode,
  type ReferencePresentationSource,
} from "@/lib/ai/web-search/reference-presentation"
import type { WebSearchResult } from "@/lib/ai/web-search/types"

describe("reference presentation contract", () => {
  it("marks verified sources as claimable", () => {
    const sources: ReferencePresentationSource[] = buildReferencePresentationSources({
      citations: [
        { url: "https://example.com/paper", title: "Paper A" },
      ],
      fetchedContent: [
        {
          url: "https://example.com/paper",
          resolvedUrl: "https://example.com/paper",
          title: "Paper A",
          publishedAt: null,
          documentKind: "pdf",
          pageContent: "Verified content",
          fullContent: "Verified content",
          fetchMethod: "tavily",
          exactMetadataAvailable: false,
          paragraphs: null,
          documentText: null,
          rawTitle: null,
          author: null,
          siteName: null,
        },
      ],
    })

    expect(sources[0].verificationStatus).toBe("verified_content")
    expect(sources[0].referenceAvailable).toBe(true)
    expect(sources[0].claimable).toBe(true)
  })

  it("keeps unverified URLs displayable but not claimable", () => {
    const sources = buildReferencePresentationSources({
      citations: [
        { url: "https://example.com/file.pdf", title: "Paper PDF" },
      ],
      fetchedContent: [],
    })

    expect(sources[0].verificationStatus).toBe("unverified_link")
    expect(sources[0].referenceAvailable).toBe(true)
    expect(sources[0].claimable).toBe(false)
  })

  it("switches to reference_inventory mode for explicit link/pdf requests", () => {
    const mode = inferSearchResponseMode({
      lastUserMessage: "carikan link PDF dan paper akademiknya",
    })

    expect(mode).toBe("reference_inventory")
  })

  it("recognizes common inventory phrasing as reference inventory mode", () => {
    expect(
      inferSearchResponseMode({ lastUserMessage: "tampilkan sumbernya" })
    ).toBe("reference_inventory")
    expect(
      inferSearchResponseMode({ lastUserMessage: "kasih rujukan yang dipakai" })
    ).toBe("reference_inventory")
    expect(
      inferSearchResponseMode({ lastUserMessage: "bikin daftar pustaka" })
    ).toBe("reference_inventory")
  })

  it("preserves semantic ref values instead of stripping them", () => {
    const sources = buildReferencePresentationSources({
      citations: [
        {
          url: "https://example.com/paper?ref=chapter-1",
          title: "Chapter reference",
        },
        {
          url: "https://example.com/paper",
          title: "Base paper",
        },
      ],
      fetchedContent: [],
    })

    expect(sources).toHaveLength(2)
    expect(sources[0].url).toBe("https://example.com/paper?ref=chapter-1")
    expect(sources[1].url).toBe("https://example.com/paper")
  })

  it("deduplicates citation inputs before fetched-content upgrade", () => {
    const sources = buildReferencePresentationSources({
      citations: [
        {
          url: "http://example.com/paper?utm_source=newsletter#section",
          title: "http://example.com/paper?utm_source=newsletter#section",
        },
        {
          url: "https://example.com/paper?fbclid=abc123",
          title: "Paper A",
        },
      ],
      fetchedContent: [
        {
          url: "https://example.com/paper?gclid=xyz789",
          resolvedUrl: "https://example.com/paper?fbclid=abc123",
          title: "Paper A",
          publishedAt: null,
          documentKind: "pdf",
          pageContent: "Verified content",
          fullContent: "Verified content",
          fetchMethod: "tavily",
          exactMetadataAvailable: false,
          paragraphs: null,
          documentText: null,
          rawTitle: null,
          author: null,
          siteName: null,
        },
      ],
    })

    expect(sources).toHaveLength(1)
    expect(sources[0].verificationStatus).toBe("verified_content")
    expect(sources[0].title).toBe("Paper A")
    expect(sources[0].url).toBe("https://example.com/paper")
  })

  it("exposes a shared reference presentation slot on WebSearchResult", () => {
    const result: WebSearchResult = {
      text: "",
      sources: [],
      referencePresentation: {
        responseMode: "reference_inventory",
        sources: [],
      },
      retrieverName: "demo",
      retrieverIndex: 0,
      attemptedRetrievers: [],
    }

    expect(result.referencePresentation?.responseMode).toBe("reference_inventory")
    expect(result.referencePresentation?.sources).toHaveLength(0)
  })
})
