import { describe, expect, it } from "vitest"
import {
  buildReferencePresentationSources,
  inferSearchResponseMode,
  type ReferencePresentationSource,
} from "@/lib/ai/web-search/reference-presentation"

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
})
