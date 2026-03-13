import { describe, it, expect } from "vitest"
import { webSearchQualitySkill } from "@/lib/ai/skills/web-search-quality"

describe("web-search-quality skill", () => {
  it("has correct name", () => {
    expect(webSearchQualitySkill.name).toBe("web-search-quality")
  })

  it("returns instructions for chat mode", () => {
    const result = webSearchQualitySkill.getInstructions({
      isPaperMode: false,
      currentStage: null,
      hasRecentSources: true,
      availableSources: [{ url: "https://arxiv.org/abs/123", title: "Test" }],
    })
    expect(result).not.toBeNull()
    expect(result).toContain("RESEARCH SOURCE STRATEGY")
    expect(result).toContain("REFERENCE INTEGRITY")
  })

  it("returns instructions for passive paper stages (default guidance)", () => {
    const result = webSearchQualitySkill.getInstructions({
      isPaperMode: true,
      currentStage: "outline",
      hasRecentSources: true,
      availableSources: [{ url: "https://arxiv.org/abs/123", title: "Test" }],
    })
    expect(result).not.toBeNull()
    expect(result).toContain("STAGE CONTEXT")
  })

  it("includes stage guidance for active paper stages", () => {
    const result = webSearchQualitySkill.getInstructions({
      isPaperMode: true,
      currentStage: "tinjauan_literatur",
      hasRecentSources: true,
      availableSources: [{ url: "https://arxiv.org/abs/123", title: "Test" }],
    })
    expect(result).not.toBeNull()
    expect(result).toContain("STAGE CONTEXT")
  })

  it("returns null for paper mode with no stage set", () => {
    const result = webSearchQualitySkill.getInstructions({
      isPaperMode: true,
      currentStage: null,
      hasRecentSources: true,
      availableSources: [{ url: "https://arxiv.org/abs/123", title: "Test" }],
    })
    expect(result).toBeNull()
  })

  it("returns null when no recent sources and not paper mode", () => {
    const result = webSearchQualitySkill.getInstructions({
      isPaperMode: false,
      currentStage: null,
      hasRecentSources: false,
      availableSources: [],
    })
    expect(result).toBeNull()
  })

  it("exposes scoreSources function", () => {
    const result = webSearchQualitySkill.scoreSources([
      { url: "https://arxiv.org/abs/123", title: "A Research Paper Title" },
    ])
    expect(result.valid).toBe(true)
    expect(result.scoredSources).toHaveLength(1)
  })

  it("exposes checkReferences function", () => {
    const result = webSearchQualitySkill.checkReferences({
      toolName: "createArtifact",
      claimedSources: [{ url: "https://arxiv.org/abs/123", title: "Test" }],
      availableSources: [{ url: "https://arxiv.org/abs/123", title: "Test" }],
      hasRecentSources: true,
    })
    expect(result.valid).toBe(true)
  })
})
