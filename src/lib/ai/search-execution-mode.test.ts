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
      primaryEnabled: true,
      fallbackOnlineEnabled: true,
      fallbackProvider: "openrouter",
    })

    expect(mode).toBe("primary_google_search")
  })

  it("selects fallback mode when primary unavailable and openrouter online fallback is enabled", () => {
    const mode = resolveSearchExecutionMode({
      searchRequired: true,
      primaryToolReady: false,
      primaryEnabled: true,
      fallbackOnlineEnabled: true,
      fallbackProvider: "openrouter",
    })

    expect(mode).toBe("fallback_online_search")
  })

  it("selects blocked mode when search is required and no search engine is available", () => {
    const mode = resolveSearchExecutionMode({
      searchRequired: true,
      primaryToolReady: false,
      primaryEnabled: true,
      fallbackOnlineEnabled: false,
      fallbackProvider: "openrouter",
    })

    expect(mode).toBe("blocked_unavailable")
  })

  it("never returns off when search is required", () => {
    const mode = resolveSearchExecutionMode({
      searchRequired: true,
      primaryToolReady: false,
      primaryEnabled: true,
      fallbackOnlineEnabled: false,
      fallbackProvider: "vercel-gateway",
    })

    expect(mode).not.toBe("off")
  })

  it("returns off when search is not required", () => {
    const mode = resolveSearchExecutionMode({
      searchRequired: false,
      primaryToolReady: false,
      primaryEnabled: true,
      fallbackOnlineEnabled: true,
      fallbackProvider: "openrouter",
    })

    expect(mode).toBe("off")
  })

  it("skips primary and falls to fallback when primaryEnabled is false", () => {
    const mode = resolveSearchExecutionMode({
      searchRequired: true,
      primaryToolReady: true,
      primaryEnabled: false,
      fallbackOnlineEnabled: true,
      fallbackProvider: "openrouter",
    })
    expect(mode).toBe("fallback_online_search")
  })

  it("returns blocked when primaryEnabled is false and no fallback", () => {
    const mode = resolveSearchExecutionMode({
      searchRequired: true,
      primaryToolReady: true,
      primaryEnabled: false,
      fallbackOnlineEnabled: false,
      fallbackProvider: "openrouter",
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
