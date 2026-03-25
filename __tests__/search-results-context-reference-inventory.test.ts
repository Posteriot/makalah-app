import { describe, expect, it } from "vitest"
import { buildSearchResultsContext } from "@/lib/ai/search-results-context"

describe("buildSearchResultsContext — reference inventory mode", () => {
  it("builds reference inventory context that distinguishes displayable links from claimable content", () => {
    const result = buildSearchResultsContext(
      [
        {
          url: "https://example.com/a.pdf",
          title: "Paper A",
          documentKind: "pdf",
          verificationStatus: "unverified_link",
          referenceAvailable: true,
          claimable: false,
        },
        {
          url: "https://example.com/b",
          title: "Paper B",
          pageContent: "Verified content",
          documentKind: "html",
          verificationStatus: "verified_content",
          referenceAvailable: true,
          claimable: true,
        },
      ] as any,
      undefined,
      { responseMode: "reference_inventory" }
    )

    expect(result).toContain("REFERENCE INVENTORY MODE")
    expect(result).toContain("display the URL when available")
    expect(result).toContain("do not make factual claims from unverified links")
  })
})
