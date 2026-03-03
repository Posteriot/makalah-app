import { describe, expect, it } from "vitest"
import {
  mapSearchToolReasonToFallbackReason,
  resolveSearchExecutionMode,
} from "./search-execution-mode"

describe("resolveSearchExecutionMode", () => {
  it("selects primary mode when search is required and primary tool is ready", () => {
    const mode = resolveSearchExecutionMode({
      searchRequired: true,
      primaryToolReady: true,
      fallbackOnlineEnabled: true,
      fallbackProvider: "openrouter",
    })

    expect(mode).toBe("primary_google_search")
  })

  it("selects fallback mode when primary unavailable and openrouter online fallback is enabled", () => {
    const mode = resolveSearchExecutionMode({
      searchRequired: true,
      primaryToolReady: false,
      fallbackOnlineEnabled: true,
      fallbackProvider: "openrouter",
    })

    expect(mode).toBe("fallback_online_search")
  })

  it("selects blocked mode when search is required and no search engine is available", () => {
    const mode = resolveSearchExecutionMode({
      searchRequired: true,
      primaryToolReady: false,
      fallbackOnlineEnabled: false,
      fallbackProvider: "openrouter",
    })

    expect(mode).toBe("blocked_unavailable")
  })

  it("never returns off when search is required", () => {
    const mode = resolveSearchExecutionMode({
      searchRequired: true,
      primaryToolReady: false,
      fallbackOnlineEnabled: false,
      fallbackProvider: "vercel-gateway",
    })

    expect(mode).not.toBe("off")
  })

  it("returns off when search is not required", () => {
    const mode = resolveSearchExecutionMode({
      searchRequired: false,
      primaryToolReady: false,
      fallbackOnlineEnabled: true,
      fallbackProvider: "openrouter",
    })

    expect(mode).toBe("off")
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
})

