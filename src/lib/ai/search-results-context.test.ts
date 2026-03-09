import { describe, it, expect } from "vitest"
import { buildSearchResultsContext } from "@/lib/ai/search-results-context"

describe("buildSearchResultsContext", () => {
  it("should format sources with titles, URLs, and tiers", () => {
    const sources = [
      { url: "https://bps.go.id/stats", title: "BPS Statistics 2025", tier: "institutional" as const, score: 80 },
      { url: "https://arxiv.org/paper", title: "AI Impact Study", tier: "academic" as const, score: 90 },
    ]

    const result = buildSearchResultsContext(sources)

    expect(result).toContain("SEARCH RESULTS")
    expect(result).toContain("BPS Statistics 2025")
    expect(result).toContain("https://bps.go.id/stats")
    expect(result).toContain("institutional")
    expect(result).toContain("AI Impact Study")
    expect(result).toContain("academic")
    expect(result).toContain("ONLY these sources")
    expect(result).not.toContain("Raw search summary")
  })

  it("should handle empty sources gracefully", () => {
    const result = buildSearchResultsContext([])
    expect(result).toContain("No sources found")
  })

  it("should handle sources without tier info", () => {
    const sources = [
      { url: "https://example.com/article", title: "Some Article" },
    ]
    const result = buildSearchResultsContext(sources)
    expect(result).toContain("Some Article")
    expect(result).toContain("https://example.com/article")
  })
})
