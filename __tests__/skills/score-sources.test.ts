import { describe, it, expect } from "vitest"
import {
  scoreSources,
} from "@/lib/ai/skills/web-search-quality/scripts/score-sources"

describe("score-sources", () => {
  describe("scoreSources", () => {
    it("filters blocked domains and passes everything else", () => {
      const result = scoreSources([
        { url: "https://en.wikipedia.org/wiki/AI", title: "AI Wikipedia" },
        { url: "https://arxiv.org/abs/2401.12345", title: "Deep Learning Research Paper" },
        { url: "https://kabarbursa.com/article", title: "Kabar Bursa Article" },
      ])
      expect(result.valid).toBe(true)
      expect(result.scoredSources).toHaveLength(2)
      expect(result.scoredSources[0].tier).toBe("pass")
      expect(result.scoredSources[1].tier).toBe("pass")
      expect(result.filteredOut).toHaveLength(1)
      expect(result.filteredOut[0].url).toContain("wikipedia.org")
    })

    it("returns invalid when all sources are blocked", () => {
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

    it("passes all non-blocked sources regardless of domain", () => {
      const result = scoreSources([
        { url: "https://kompas.com/article-1", title: "Kompas Article" },
        { url: "https://asosiasi.ai/report", title: "Asosiasi AI Report" },
        { url: "https://tv.kontan.co.id/video", title: "Kontan Video" },
        { url: "https://journal.appini.or.id/paper", title: "Journal Paper" },
        { url: "https://cnbcindonesia.com/news", title: "CNBC Indonesia" },
      ])
      expect(result.valid).toBe(true)
      expect(result.scoredSources).toHaveLength(5)
      expect(result.filteredOut).toHaveLength(0)
    })

    it("blocks all blog/UGC platforms", () => {
      const result = scoreSources([
        { url: "https://myblog.blogspot.com/post", title: "Blog Post" },
        { url: "https://someone.wordpress.com/article", title: "WP Article" },
        { url: "https://medium.com/@user/story", title: "Medium Story" },
        { url: "https://substack.com/post", title: "Substack Post" },
        { url: "https://quora.com/question", title: "Quora Question" },
        { url: "https://brainly.co.id/tugas/123", title: "Brainly Answer" },
      ])
      expect(result.valid).toBe(false)
      expect(result.scoredSources).toHaveLength(0)
      expect(result.filteredOut).toHaveLength(6)
    })
  })
})
