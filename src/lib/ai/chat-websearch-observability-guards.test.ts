import { describe, expect, it } from "vitest"
import fs from "node:fs"
import path from "node:path"

const repoRoot = path.resolve(__dirname, "..", "..", "..")
const _routePath = path.join(repoRoot, "src/app/api/chat/route.ts")
const searchDecisionPath = path.join(repoRoot, "src/lib/chat-harness/context/resolve-search-decision.ts")
const telemetryPath = path.join(repoRoot, "src/lib/ai/telemetry.ts")

describe("chat websearch observability guards", () => {
  it("keeps fail-closed reason and explicit search-unavailable response", () => {
    // Phase 3: search decision + response factories moved to context modules
    const searchSource = fs.readFileSync(searchDecisionPath, "utf8")
    const responseFactoriesPath = path.join(repoRoot, "src/lib/chat-harness/context/response-factories.ts")
    const responseFactories = fs.readFileSync(responseFactoriesPath, "utf8")
    const combined = searchSource + "\n" + responseFactories

    expect(combined).toContain('search_required_but_unavailable')
    expect(combined).toContain('reasonCode')
    expect(combined).toContain('telemetryFallbackReason')
    expect(combined).toContain('status: "error"')
  })

  it("keeps telemetry fields required for ai-ops diagnosis", () => {
    const telemetrySource = fs.readFileSync(telemetryPath, "utf8")

    expect(telemetrySource).toContain('toolUsed?: string')
    expect(telemetrySource).toContain('mode: "normal" | "websearch" | "paper"')
    expect(telemetrySource).toContain("success: boolean")
    expect(telemetrySource).toContain("fallbackReason?: string")
  })
})

