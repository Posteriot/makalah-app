import { describe, expect, it } from "vitest"
import { buildSearchResultsContext } from "@/lib/ai/search-results-context"

describe("buildSearchResultsContext — reference inventory mode", () => {
  it("builds reference inventory context that distinguishes displayable links from claimable content", () => {
    const sources = [
      {
        url: "https://example.com/a.pdf",
        title: "Paper A",
      },
      {
        url: "https://example.com/b",
        title: "Paper B",
      },
    ]

    const result = buildSearchResultsContext(
      sources,
      "Raw search findings",
      { responseMode: "reference_inventory" }
    )

    expect(result).toContain("REFERENCE INVENTORY MODE")
    expect(result).toContain("display the URL when available")
    expect(result).toContain("do not make factual claims from unverified links")
    expect(result).not.toContain("for your synthesis")
    expect(result).toContain("for reference inventory")
  })

  it("uses mixed mode wording when responseMode is mixed", () => {
    const result = buildSearchResultsContext(
      [{ url: "https://example.com/a", title: "Paper A" }],
      "Raw search text",
      { responseMode: "mixed" }
    )

    expect(result).toContain("MIXED MODE")
    expect(result).toContain("brief synthesis first")
    expect(result).toContain("compact reference inventory")
  })
})
