import { describe, expect, it } from "vitest"
import fs from "node:fs"
import path from "node:path"

const repoRoot = path.resolve(__dirname, "..", "..", "..")
const routePath = path.join(repoRoot, "src/app/api/chat/route.ts")
const searchModePath = path.join(repoRoot, "src/lib/ai/search-execution-mode.ts")
const telemetryPath = path.join(repoRoot, "src/lib/ai/telemetry.ts")

describe("chat websearch observability guards", () => {
  it("keeps fail-closed reason and explicit search-unavailable response", () => {
    const routeSource = fs.readFileSync(routePath, "utf8")

    expect(routeSource).toContain('searchUnavailableReasonCode = "search_required_but_unavailable"')
    expect(routeSource).toContain('reasonCode: "search_required_but_unavailable"')
    expect(routeSource).toContain('telemetryFallbackReason: "search_required_but_unavailable"')
    expect(routeSource).toContain('status: "error"')
    expect(routeSource).toContain("message: input.message")
  })

  it("keeps fallback-online telemetry reason when primary web tool unavailable", () => {
    const routeSource = fs.readFileSync(routePath, "utf8")

    expect(routeSource).toContain('fallbackReason: "websearch_primary_tool_unavailable_fallback_online"')
  })

  it("keeps mapping for all primary google_search unavailability reasons", () => {
    const searchModeSource = fs.readFileSync(searchModePath, "utf8")

    expect(searchModeSource).toContain('if (reason === "import_failed") return "google_search_tool_import_failed"')
    expect(searchModeSource).toContain('if (reason === "factory_missing") return "google_search_tool_factory_missing"')
    expect(searchModeSource).toContain('if (reason === "factory_init_failed") return "google_search_tool_factory_init_failed"')
  })

  it("keeps telemetry fields required for ai-ops diagnosis", () => {
    const telemetrySource = fs.readFileSync(telemetryPath, "utf8")

    expect(telemetrySource).toContain('toolUsed?: string')
    expect(telemetrySource).toContain('mode: "normal" | "websearch" | "paper"')
    expect(telemetrySource).toContain("success: boolean")
    expect(telemetrySource).toContain("fallbackReason?: string")
  })
})

