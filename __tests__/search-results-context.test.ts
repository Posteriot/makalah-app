import { describe, it, expect } from "vitest"
import { buildSearchResultsContext } from "@/lib/ai/search-results-context"

describe("buildSearchResultsContext", () => {
  it("uses imperative language indicating search is completed", () => {
    const result = buildSearchResultsContext(
      [{ url: "https://example.com", title: "Example" }],
      "Some search text"
    )
    expect(result).toContain("SEARCH RESULTS (COMPLETED)")
    expect(result).toContain("Web search has been executed")
    expect(result).toContain("MUST synthesize these sources")
    // Must NOT contain old passive language
    expect(result).not.toContain("You have the following sources from web search")
  })

  it("returns no-sources message when sources array is empty", () => {
    const result = buildSearchResultsContext([], "")
    expect(result).toContain("No sources found")
  })

  it("includes source list with numbered entries", () => {
    const result = buildSearchResultsContext(
      [
        { url: "https://a.com", title: "Source A" },
        { url: "https://b.com", title: "Source B" },
      ],
      ""
    )
    expect(result).toContain("1. Source A — https://a.com")
    expect(result).toContain("2. Source B — https://b.com")
  })

  it("includes search findings when provided", () => {
    const result = buildSearchResultsContext(
      [{ url: "https://a.com", title: "A" }],
      "Raw search text here"
    )
    expect(result).toContain("Search findings")
    expect(result).toContain("Raw search text here")
    expect(result).toContain("do NOT copy verbatim")
  })

  it("omits search findings section when searchText is empty", () => {
    const result = buildSearchResultsContext(
      [{ url: "https://a.com", title: "A" }],
      ""
    )
    expect(result).not.toContain("Search findings")
  })

  it("renders snippet when citedText is provided", () => {
    const result = buildSearchResultsContext(
      [{ url: "https://a.com", title: "Source A", citedText: "Key finding from page" }],
      ""
    )
    expect(result).toContain("1. Source A — https://a.com")
    expect(result).toContain("   Snippet: Key finding from page")
  })

  it("omits snippet line when citedText is absent", () => {
    const result = buildSearchResultsContext(
      [{ url: "https://a.com", title: "Source A" }],
      ""
    )
    expect(result).toContain("1. Source A — https://a.com")
    expect(result).not.toContain("Snippet:")
  })

  it("renders mixed sources with and without citedText", () => {
    const result = buildSearchResultsContext(
      [
        { url: "https://a.com", title: "Source A", citedText: "Snippet A" },
        { url: "https://b.com", title: "Source B" },
        { url: "https://c.com", title: "Source C", citedText: "Snippet C" },
      ],
      ""
    )
    expect(result).toContain("1. Source A — https://a.com\n   Snippet: Snippet A")
    expect(result).toContain("2. Source B — https://b.com")
    expect(result).not.toContain("2. Source B — https://b.com\n   Snippet:")
    expect(result).toContain("3. Source C — https://c.com\n   Snippet: Snippet C")
  })
})
