import { describe, it, expect } from "vitest"
import {
  checkReferences,
  canonicalizeUrl,
} from "@/lib/ai/skills/web-search-quality/scripts/check-references"

describe("check-references", () => {
  describe("canonicalizeUrl", () => {
    it("strips UTM parameters", () => {
      expect(canonicalizeUrl("https://example.com/page?utm_source=google&utm_medium=cpc"))
        .toBe("https://example.com/page")
    })

    it("strips hash fragments", () => {
      expect(canonicalizeUrl("https://example.com/page#section"))
        .toBe("https://example.com/page")
    })

    it("strips trailing slash", () => {
      expect(canonicalizeUrl("https://example.com/page/"))
        .toBe("https://example.com/page")
    })

    it("handles invalid URLs gracefully", () => {
      expect(canonicalizeUrl("not-a-url")).toBe("not-a-url")
    })
  })

  describe("checkReferences", () => {
    const available = [
      { url: "https://arxiv.org/abs/2401.12345", title: "Paper A" },
      { url: "https://bps.go.id/data/123", title: "BPS Data" },
    ]

    it("validates matching sources for createArtifact", () => {
      const result = checkReferences({
        toolName: "createArtifact",
        claimedSources: [{ url: "https://arxiv.org/abs/2401.12345", title: "Paper A" }],
        availableSources: available,
        hasRecentSources: true,
      })
      expect(result.valid).toBe(true)
    })

    it("rejects fabricated URLs for createArtifact", () => {
      const result = checkReferences({
        toolName: "createArtifact",
        claimedSources: [{ url: "https://fabricated.com/fake", title: "Fake" }],
        availableSources: available,
        hasRecentSources: true,
      })
      expect(result.valid).toBe(false)
      expect(result.error).toContain("fabricated.com")
    })

    it("requires sources when search results are available for createArtifact", () => {
      const result = checkReferences({
        toolName: "createArtifact",
        claimedSources: [],
        availableSources: available,
        hasRecentSources: true,
      })
      expect(result.valid).toBe(false)
    })

    it("passes when no recent sources exist", () => {
      const result = checkReferences({
        toolName: "createArtifact",
        claimedSources: [],
        availableSources: [],
        hasRecentSources: false,
      })
      expect(result.valid).toBe(true)
    })

    it("validates updateStageData references with URL matching", () => {
      const result = checkReferences({
        toolName: "updateStageData",
        claimedReferences: [
          { title: "Paper A", url: "https://arxiv.org/abs/2401.12345", authors: "Author" },
        ],
        availableSources: available,
        hasRecentSources: true,
      })
      expect(result.valid).toBe(true)
    })

    it("allows updateStageData references without URL", () => {
      const result = checkReferences({
        toolName: "updateStageData",
        claimedReferences: [
          { title: "Paper A", authors: "Author" },
        ],
        availableSources: available,
        hasRecentSources: true,
      })
      expect(result.valid).toBe(true)
    })

    it("matches URLs with UTM parameters stripped", () => {
      const result = checkReferences({
        toolName: "createArtifact",
        claimedSources: [
          { url: "https://arxiv.org/abs/2401.12345?utm_source=google", title: "Paper A" },
        ],
        availableSources: available,
        hasRecentSources: true,
      })
      expect(result.valid).toBe(true)
    })
  })
})
