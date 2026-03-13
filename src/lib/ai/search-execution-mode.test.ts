import { describe, expect, it } from "vitest"
import {
  resolveSearchExecutionMode,
} from "./web-search/search-execution-mode"

describe("resolveSearchExecutionMode", () => {
  it("selects first enabled retriever when search required", () => {
    const mode = resolveSearchExecutionMode({
      searchRequired: true,
      retrievers: [
        { name: "perplexity", enabled: true, modelId: "perplexity/sonar" },
        { name: "grok", enabled: true, modelId: "x-ai/grok-3-mini" },
      ],
    })

    expect(mode).toBe("perplexity")
  })

  it("selects fallback when primary disabled", () => {
    const mode = resolveSearchExecutionMode({
      searchRequired: true,
      retrievers: [
        { name: "perplexity", enabled: false, modelId: "perplexity/sonar" },
        { name: "grok", enabled: true, modelId: "x-ai/grok-3-mini" },
      ],
    })

    expect(mode).toBe("grok")
  })

  it("selects fallback when primary enabled but model undefined", () => {
    const mode = resolveSearchExecutionMode({
      searchRequired: true,
      retrievers: [
        { name: "perplexity", enabled: true, modelId: undefined },
        { name: "grok", enabled: true, modelId: "x-ai/grok-3-mini" },
      ],
    })

    expect(mode).toBe("grok")
  })

  it("selects blocked mode when search required but no models available", () => {
    const mode = resolveSearchExecutionMode({
      searchRequired: true,
      retrievers: [
        { name: "perplexity", enabled: true, modelId: undefined },
        { name: "grok", enabled: false, modelId: undefined },
      ],
    })

    expect(mode).toBe("blocked_unavailable")
  })

  it("never returns off when search is required", () => {
    const mode = resolveSearchExecutionMode({
      searchRequired: true,
      retrievers: [
        { name: "perplexity", enabled: false, modelId: undefined },
        { name: "grok", enabled: false, modelId: undefined },
      ],
    })

    expect(mode).not.toBe("off")
  })

  it("returns off when search is not required", () => {
    const mode = resolveSearchExecutionMode({
      searchRequired: false,
      retrievers: [
        { name: "perplexity", enabled: true, modelId: "perplexity/sonar" },
        { name: "grok", enabled: true, modelId: "x-ai/grok-3-mini" },
      ],
    })

    expect(mode).toBe("off")
  })

  it("returns blocked when both enabled but both models undefined", () => {
    const mode = resolveSearchExecutionMode({
      searchRequired: true,
      retrievers: [
        { name: "perplexity", enabled: true, modelId: undefined },
        { name: "grok", enabled: true, modelId: undefined },
      ],
    })
    expect(mode).toBe("blocked_unavailable")
  })

  it("supports N retrievers in priority order", () => {
    const mode = resolveSearchExecutionMode({
      searchRequired: true,
      retrievers: [
        { name: "perplexity", enabled: false, modelId: "perplexity/sonar" },
        { name: "grok", enabled: false, modelId: "x-ai/grok-3-mini" },
        { name: "google-grounding", enabled: true, modelId: "google/gemini-2.5-flash" },
      ],
    })
    expect(mode).toBe("google-grounding")
  })
})
