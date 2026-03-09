import { describe, it, expect } from "vitest"
import {
  classifyDomain,
  scoreSources,
} from "@/lib/ai/skills/web-search-quality/scripts/score-sources"

describe("score-sources", () => {
  describe("classifyDomain", () => {
    it("classifies academic domains", () => {
      expect(classifyDomain("https://arxiv.org/abs/2401.12345")).toBe("academic")
      expect(classifyDomain("https://scholar.google.com/scholar?q=test")).toBe("academic")
      expect(classifyDomain("https://repository.ui.ac.id/paper")).toBe("academic")
    })

    it("classifies institutional domains", () => {
      expect(classifyDomain("https://bps.go.id/data")).toBe("institutional")
      expect(classifyDomain("https://data.worldbank.org/indicator")).toBe("institutional")
    })

    it("classifies major news", () => {
      expect(classifyDomain("https://kompas.com/article")).toBe("news-major")
      expect(classifyDomain("https://reuters.com/world")).toBe("news-major")
    })

    it("classifies blocked domains", () => {
      expect(classifyDomain("https://en.wikipedia.org/wiki/Test")).toBe("blocked")
      expect(classifyDomain("https://reddit.com/r/test")).toBe("blocked")
    })

    it("classifies unknown domains", () => {
      expect(classifyDomain("https://randomsite.com/article")).toBe("unknown")
    })
  })

  describe("scoreSources", () => {
    it("filters sources below quality threshold", () => {
      const result = scoreSources([
        { url: "https://en.wikipedia.org/wiki/AI", title: "AI Wikipedia" },
        { url: "https://arxiv.org/abs/2401.12345", title: "Deep Learning Research Paper" },
      ])
      expect(result.valid).toBe(true)
      expect(result.scoredSources).toHaveLength(1)
      expect(result.scoredSources[0].url).toContain("arxiv.org")
      expect(result.filteredOut).toHaveLength(1)
    })

    it("returns invalid when all sources are below threshold", () => {
      const result = scoreSources([
        { url: "https://en.wikipedia.org/wiki/AI", title: "AI" },
        { url: "https://reddit.com/r/ai", title: "Reddit AI" },
      ])
      expect(result.valid).toBe(false)
      expect(result.error).toBeDefined()
    })

    it("returns valid with empty sources", () => {
      const result = scoreSources([])
      expect(result.valid).toBe(true)
    })

    it("detects low diversity (3+ from same domain)", () => {
      const result = scoreSources([
        { url: "https://kompas.com/article-1", title: "Article One About Topic" },
        { url: "https://kompas.com/article-2", title: "Article Two About Topic" },
        { url: "https://kompas.com/article-3", title: "Article Three About Topic" },
      ])
      expect(result.valid).toBe(true)
      expect(result.diversityWarning).toBeDefined()
      expect(result.diversityWarning).toContain("kompas.com")
    })

    it("applies scoring bonuses and penalties", () => {
      const result = scoreSources([
        { url: "https://arxiv.org/", title: "ArXiv" },
        { url: "https://arxiv.org/abs/2401.12345", title: "Deep Learning Research Paper" },
      ])
      expect(result.scoredSources).toHaveLength(2)
      const homepage = result.scoredSources.find(s => s.url === "https://arxiv.org/")!
      const article = result.scoredSources.find(s => s.url.includes("abs"))!
      expect(article.score).toBeGreaterThan(homepage.score)
    })
  })
})
