import { describe, expect, it } from "vitest"
import {
  mapSearchToolReasonToFallbackReason,
  resolveSearchExecutionMode,
} from "./search-execution-mode"

describe("resolveSearchExecutionMode", () => {
  it("selects primary_perplexity when search required and web search model configured", () => {
    const mode = resolveSearchExecutionMode({
      searchRequired: true,
      webSearchEnabled: true,
      webSearchModel: "perplexity/sonar",
      fallbackWebSearchEnabled: true,
      webSearchFallbackModel: "x-ai/grok-3-mini",
    })

    expect(mode).toBe("primary_perplexity")
  })

  it("selects fallback_web_search when primary disabled but fallback enabled", () => {
    const mode = resolveSearchExecutionMode({
      searchRequired: true,
      webSearchEnabled: false,
      webSearchModel: "perplexity/sonar",
      fallbackWebSearchEnabled: true,
      webSearchFallbackModel: "x-ai/grok-3-mini",
    })

    expect(mode).toBe("fallback_web_search")
  })

  it("selects fallback_web_search when primary enabled but model undefined", () => {
    const mode = resolveSearchExecutionMode({
      searchRequired: true,
      webSearchEnabled: true,
      webSearchModel: undefined,
      fallbackWebSearchEnabled: true,
      webSearchFallbackModel: "x-ai/grok-3-mini",
    })

    expect(mode).toBe("fallback_web_search")
  })

  it("selects blocked mode when search required but no models available", () => {
    const mode = resolveSearchExecutionMode({
      searchRequired: true,
      webSearchEnabled: true,
      webSearchModel: undefined,
      fallbackWebSearchEnabled: false,
      webSearchFallbackModel: undefined,
    })

    expect(mode).toBe("blocked_unavailable")
  })

  it("never returns off when search is required", () => {
    const mode = resolveSearchExecutionMode({
      searchRequired: true,
      webSearchEnabled: false,
      webSearchModel: undefined,
      fallbackWebSearchEnabled: false,
      webSearchFallbackModel: undefined,
    })

    expect(mode).not.toBe("off")
  })

  it("returns off when search is not required", () => {
    const mode = resolveSearchExecutionMode({
      searchRequired: false,
      webSearchEnabled: true,
      webSearchModel: "perplexity/sonar",
      fallbackWebSearchEnabled: true,
      webSearchFallbackModel: "x-ai/grok-3-mini",
    })

    expect(mode).toBe("off")
  })

  it("returns blocked when both enabled but both models undefined", () => {
    const mode = resolveSearchExecutionMode({
      searchRequired: true,
      webSearchEnabled: true,
      webSearchModel: undefined,
      fallbackWebSearchEnabled: true,
      webSearchFallbackModel: undefined,
    })
    expect(mode).toBe("blocked_unavailable")
  })
})

describe("mapSearchToolReasonToFallbackReason", () => {
  it("maps factory_missing to explicit telemetry reason", () => {
    expect(mapSearchToolReasonToFallbackReason("factory_missing"))
      .toBe("google_search_tool_factory_missing")
  })

  it("maps import_failed to explicit telemetry reason", () => {
    expect(mapSearchToolReasonToFallbackReason("import_failed"))
      .toBe("google_search_tool_import_failed")
  })

  it("maps factory_init_failed to explicit telemetry reason", () => {
    expect(mapSearchToolReasonToFallbackReason("factory_init_failed"))
      .toBe("google_search_tool_factory_init_failed")
  })
})
