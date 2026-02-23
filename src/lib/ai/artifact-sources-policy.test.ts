import { describe, it, expect } from "vitest"
import {
  hasValidArtifactSources,
  enforceArtifactSourcesPolicy,
} from "./artifact-sources-policy"

describe("artifact sources policy", () => {
  describe("hasValidArtifactSources", () => {
    it("returns false when sources undefined", () => {
      expect(hasValidArtifactSources(undefined)).toBe(false)
    })

    it("returns false when sources empty", () => {
      expect(hasValidArtifactSources([])).toBe(false)
    })

    it("returns false when url/title invalid", () => {
      expect(hasValidArtifactSources([{ url: "", title: "Valid title" }])).toBe(false)
      expect(hasValidArtifactSources([{ url: "https://example.com", title: "" }])).toBe(false)
    })

    it("returns true when all sources valid", () => {
      expect(
        hasValidArtifactSources([
          { url: "https://example.com/a", title: "A" },
          { url: "https://example.com/b", title: "B", publishedAt: 1710000000 },
        ])
      ).toBe(true)
    })
  })

  describe("enforceArtifactSourcesPolicy", () => {
    it("allows createArtifact when no recent sources in db", () => {
      const result = enforceArtifactSourcesPolicy({
        hasRecentSourcesInDb: false,
        sources: undefined,
        operation: "createArtifact",
      })
      expect(result.allowed).toBe(true)
    })

    it("blocks createArtifact when recent sources exist but payload has no sources", () => {
      const result = enforceArtifactSourcesPolicy({
        hasRecentSourcesInDb: true,
        sources: undefined,
        operation: "createArtifact",
      })
      expect(result.allowed).toBe(false)
      expect(result.error).toContain("createArtifact")
    })

    it("blocks updateArtifact when recent sources exist but payload has invalid sources", () => {
      const result = enforceArtifactSourcesPolicy({
        hasRecentSourcesInDb: true,
        sources: [{ url: "https://example.com", title: "" }],
        operation: "updateArtifact",
      })
      expect(result.allowed).toBe(false)
      expect(result.error).toContain("updateArtifact")
    })

    it("allows updateArtifact when recent sources exist and payload has valid sources", () => {
      const result = enforceArtifactSourcesPolicy({
        hasRecentSourcesInDb: true,
        sources: [{ url: "https://example.com", title: "Contoh" }],
        operation: "updateArtifact",
      })
      expect(result.allowed).toBe(true)
    })
  })
})

