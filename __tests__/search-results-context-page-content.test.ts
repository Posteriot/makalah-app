import { describe, it, expect } from "vitest"
import { buildSearchResultsContext } from "@/lib/ai/search-results-context"

describe("buildSearchResultsContext — with pageContent", () => {
  it("includes page content when available", () => {
    const sources = [
      {
        url: "https://example.com/article",
        title: "Test Article",
        citedText: "Some snippet",
        pageContent: "# Main Heading\n\nActual page content here.",
      },
    ]

    const result = buildSearchResultsContext(sources, "search findings text")

    expect(result).toContain("Page content (verified)")
    expect(result).toContain("Actual page content here")
  })

  it("marks sources without pageContent as unverified when some have content", () => {
    const sources = [
      { url: "https://a.com", title: "Verified", pageContent: "Real content here." },
      { url: "https://b.com", title: "Unverified" },
    ]

    const result = buildSearchResultsContext(sources, "findings")

    expect(result).toContain("Page content (verified)")
    expect(result).toContain("[no page content")
  })

  it("omits verified/unverified labels when NO source has pageContent (FetchWeb unavailable)", () => {
    const sources = [
      { url: "https://a.com", title: "Source A" },
      { url: "https://b.com", title: "Source B" },
    ]

    const result = buildSearchResultsContext(sources, "search findings")

    expect(result).not.toContain("Page content (verified)")
    expect(result).not.toContain("[no page content")
    expect(result).toContain("Source A")
    expect(result).toContain("Source B")
  })
})
